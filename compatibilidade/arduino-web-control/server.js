const express = require("express");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const os = require("os");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BAUD_RATE = 9600;

app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

let serialPort = null;
let parser = null;
let latestState = { red: false, green: false, blue: false };
let lastResponse = "Aguardando resposta do Arduino.";

function updateFromLine(line) {
  const trimmed = String(line).trim();
  if (!trimmed) return;
  console.log("[Arduino]", trimmed);
  lastResponse = trimmed;

  if (trimmed.startsWith("STATE:")) {
    const values = trimmed.slice(6).split(",");
    if (values.length === 3 && values.every((v) => v === "0" || v === "1")) {
      latestState = {
        red: values[0] === "1",
        green: values[1] === "1",
        blue: values[2] === "1"
      };
    }
  }
}

function ensureConnected() {
  if (!serialPort || !serialPort.isOpen) {
    const error = new Error("Arduino não está conectado ao servidor.");
    error.status = 409;
    throw error;
  }
}

function sendSerial(command) {
  return new Promise((resolve, reject) => {
    try {
      ensureConnected();
      serialPort.write(`${command}\n`, (writeError) => {
        if (writeError) return reject(writeError);
        serialPort.drain((drainError) => {
          if (drainError) return reject(drainError);
          resolve();
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

app.get("/api/ports", async (_req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json({
      ports: ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer || "",
        vendorId: port.vendorId || "",
        productId: port.productId || ""
      }))
    });
  } catch (error) {
    res.status(500).json({ error: `Falha ao listar portas: ${error.message}` });
  }
});

app.post("/api/connect", async (req, res) => {
  const path = typeof req.body.path === "string" ? req.body.path.trim() : "";
  if (!path) return res.status(400).json({ error: "Informe uma porta serial." });

  try {
    if (serialPort?.isOpen) {
      await new Promise((resolve, reject) => {
        serialPort.close((error) => error ? reject(error) : resolve());
      });
    }

    serialPort = new SerialPort({ path, baudRate: BAUD_RATE, autoOpen: false });
    await new Promise((resolve, reject) => {
      serialPort.open((error) => error ? reject(error) : resolve());
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));
    parser.on("data", updateFromLine);
    serialPort.on("error", (error) => {
      console.error("[Serial]", error.message);
      lastResponse = `Erro serial: ${error.message}`;
    });
    serialPort.on("close", () => {
      console.log("[Serial] Porta fechada.");
    });

    // O Uno pode reiniciar ao abrir a porta serial; aguarde antes do primeiro comando.
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await sendSerial("STATUS");
    res.json({ connected: true, path, state: latestState });
  } catch (error) {
    res.status(500).json({ error: `Não foi possível abrir ${path}: ${error.message}` });
  }
});

app.post("/api/command", async (req, res) => {
  const allowed = new Set([
    "RED_ON", "RED_OFF", "GREEN_ON", "GREEN_OFF",
    "BLUE_ON", "BLUE_OFF", "ALL_ON", "ALL_OFF", "STATUS"
  ]);
  const command = typeof req.body.command === "string" ? req.body.command : "";
  if (!allowed.has(command)) {
    return res.status(400).json({ error: "Comando inválido." });
  }

  try {
    await sendSerial(command);
    // O estado também será atualizado quando chegar a resposta serial.
    await new Promise((resolve) => setTimeout(resolve, 100));
    res.json({ sent: command, state: latestState, response: lastResponse });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get("/api/status", (_req, res) => {
  res.json({
    connected: Boolean(serialPort?.isOpen),
    state: latestState,
    response: lastResponse
  });
});

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return addresses;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Painel local: http://localhost:${PORT}`);
  for (const address of getLanAddresses()) {
    console.log(`Painel na rede: http://${address}:${PORT}`);
  }
  console.log("Modo Wi-Fi exige que o Arduino esteja conectado por USB a este computador.");
});
