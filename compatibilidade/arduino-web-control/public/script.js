const $ = (selector) => document.querySelector(selector);

const elements = {
  usbMode: $("#usbMode"),
  wifiMode: $("#wifiMode"),
  usbPane: $("#usbPane"),
  wifiPane: $("#wifiPane"),
  connectUsb: $("#connectUsb"),
  connectServer: $("#connectServer"),
  refreshPorts: $("#refreshPorts"),
  portSelect: $("#portSelect"),
  connectionBadge: $("#connectionBadge"),
  connectionMessage: $("#connectionMessage"),
  modeLabel: $("#modeLabel"),
  allOn: $("#allOn"),
  allOff: $("#allOff"),
  readStatus: $("#readStatus"),
  eventLog: $("#eventLog")
};

let mode = "usb";
let usbPort = null;
let usbWriter = null;
let usbReader = null;
let usbReadTask = null;
let usbConnected = false;
let serverConnected = false;
let currentStates = { red: false, green: false, blue: false };

function log(message) {
  const entry = document.createElement("p");
  entry.className = "log-entry";
  const time = document.createElement("span");
  time.textContent = new Date().toLocaleTimeString("pt-BR");
  entry.append(time, document.createTextNode(message));
  elements.eventLog.prepend(entry);
  while (elements.eventLog.children.length > 60) {
    elements.eventLog.lastElementChild.remove();
  }
}

function setMessage(message) {
  elements.connectionMessage.textContent = message;
}

function isConnected() {
  return mode === "usb" ? usbConnected : serverConnected;
}

function updateConnectionUI() {
  const connected = isConnected();
  elements.connectionBadge.classList.toggle("connected", connected);
  elements.connectionBadge.lastChild.textContent = connected ? " Conectado" : " Desconectado";
  document.querySelectorAll("[data-command], #allOn, #allOff, #readStatus")
    .forEach((button) => { button.disabled = !connected; });
  elements.modeLabel.textContent = mode === "usb" ? "Modo USB" : "Modo Wi-Fi / servidor";
}

function updateStates(states) {
  const keys = ["red", "green", "blue"];
  keys.forEach((key, index) => {
    if (typeof states[key] === "boolean") currentStates[key] = states[key];
    const on = currentStates[key];
    const card = document.querySelector(`[data-led="${key}"]`);
    card.querySelector(".led-symbol").classList.toggle("on", on);
    const state = $(`#${key}State`);
    state.textContent = on ? "Ligado" : "Desligado";
    state.classList.toggle("on", on);
  });
}

function parseSerialLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  log(`Arduino: ${trimmed}`);
  if (trimmed.startsWith("STATE:")) {
    const values = trimmed.slice(6).split(",").map((value) => value === "1");
    if (values.length === 3) {
      updateStates({ red: values[0], green: values[1], blue: values[2] });
    }
  } else if (trimmed.startsWith("ERROR:")) {
    setMessage(trimmed.slice(6));
  }
}

async function startUsbReader() {
  const decoder = new TextDecoderStream();
  usbPort.readable.pipeTo(decoder.writable).catch(() => {});
  const reader = decoder.readable.getReader();
  usbReader = reader;
  let buffer = "";
  usbReadTask = (async () => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        lines.forEach(parseSerialLine);
      }
    } catch (error) {
      if (usbConnected) log(`Leitura serial interrompida: ${error.message}`);
    } finally {
      try { reader.releaseLock(); } catch {}
      usbReader = null;
    }
  })();
}

async function connectUsb() {
  if (!("serial" in navigator)) {
    setMessage("Web Serial não está disponível neste navegador. Use Chrome ou Edge atualizado.");
    return;
  }
  try {
    usbPort = await navigator.serial.requestPort();
    await usbPort.open({ baudRate: 9600 });
    usbConnected = true;
    await startUsbReader();
    updateConnectionUI();
    setMessage("Arduino conectado por USB. Aguarde a inicialização da placa.");
    log("Conexão USB estabelecida.");
    await sendCommand("STATUS");
  } catch (error) {
    usbConnected = false;
    updateConnectionUI();
    setMessage(`Falha na conexão USB: ${error.message}`);
    log(`Falha USB: ${error.message}`);
  }
}

async function sendUsbCommand(command) {
  if (!usbPort?.writable) throw new Error("Porta USB não está disponível.");
  const writer = usbPort.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(`${command}\n`));
  } finally {
    writer.releaseLock();
  }
}

async function loadPorts() {
  try {
    const response = await fetch("/api/ports");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível listar as portas.");
    elements.portSelect.replaceChildren();
    if (!data.ports.length) {
      elements.portSelect.add(new Option("Nenhuma porta encontrada", ""));
      return;
    }
    data.ports.forEach((port) => {
      const label = [port.path, port.manufacturer].filter(Boolean).join(" — ");
      elements.portSelect.add(new Option(label, port.path));
    });
    setMessage(`${data.ports.length} porta(s) serial encontrada(s).`);
  } catch (error) {
    setMessage(`Não foi possível listar portas: ${error.message}. Verifique se o servidor Node.js está ativo.`);
  }
}

async function connectServer() {
  const path = elements.portSelect.value;
  if (!path) {
    setMessage("Selecione uma porta serial válida.");
    return;
  }
  try {
    const response = await fetch("/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha ao conectar.");
    serverConnected = true;
    updateConnectionUI();
    setMessage(`Servidor conectado à porta ${path}.`);
    log(`Conexão pelo servidor estabelecida em ${path}.`);
    await sendCommand("STATUS");
  } catch (error) {
    serverConnected = false;
    updateConnectionUI();
    setMessage(`Falha na conexão via servidor: ${error.message}`);
    log(`Falha no servidor: ${error.message}`);
  }
}

async function sendCommand(command) {
  try {
    if (mode === "usb") {
      if (!usbConnected) throw new Error("Conecte o Arduino por USB primeiro.");
      await sendUsbCommand(command);
      log(`Enviado via USB: ${command}`);
    } else {
      if (!serverConnected) throw new Error("Conecte o Arduino pelo servidor primeiro.");
      const response = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao enviar comando.");
      log(`Enviado pela rede: ${command}`);
      if (data.state) updateStates(data.state);
    }
  } catch (error) {
    setMessage(error.message);
    log(`Erro: ${error.message}`);
  }
}

function setMode(nextMode) {
  mode = nextMode;
  elements.usbMode.classList.toggle("active", mode === "usb");
  elements.wifiMode.classList.toggle("active", mode === "wifi");
  elements.usbPane.classList.toggle("hidden", mode !== "usb");
  elements.wifiPane.classList.toggle("hidden", mode !== "wifi");
  updateConnectionUI();
  setMessage(mode === "usb"
    ? "Modo USB selecionado. Conecte diretamente pelo navegador."
    : "Modo Wi-Fi selecionado. O servidor Node.js precisa estar em execução.");
  if (mode === "wifi") loadPorts();
}

elements.usbMode.addEventListener("click", () => setMode("usb"));
elements.wifiMode.addEventListener("click", () => setMode("wifi"));
elements.connectUsb.addEventListener("click", connectUsb);
elements.refreshPorts.addEventListener("click", loadPorts);
elements.connectServer.addEventListener("click", connectServer);

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => sendCommand(button.dataset.command));
});
elements.allOn.addEventListener("click", () => sendCommand("ALL_ON"));
elements.allOff.addEventListener("click", () => sendCommand("ALL_OFF"));
elements.readStatus.addEventListener("click", () => sendCommand("STATUS"));
$("#clearLog").addEventListener("click", () => {
  elements.eventLog.replaceChildren();
  log("Registro limpo.");
});

if ("serial" in navigator) {
  navigator.serial.addEventListener("disconnect", () => {
    usbConnected = false;
    updateConnectionUI();
    setMessage("A conexão USB foi encerrada.");
    log("Dispositivo USB desconectado.");
  });
}

updateConnectionUI();
log("Painel iniciado. Escolha USB direto ou Wi-Fi / rede.");
