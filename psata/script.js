let totalPessoas = 0;

const numero = document.getElementById("numero");
const status = document.getElementById("status");

function pessoaEntrou() {
    totalPessoas++;
    numero.textContent = totalPessoas;
    status.textContent = "Entrada registrada!";
}

async function conectarArduino() {

    try {
        const porta = await navigator.serial.requestPort();

        await porta.open({
            baudRate: 9600
        });

        status.textContent = "Arduino conectado!";

        const decoder = new TextDecoderStream();

        porta.readable.pipeTo(decoder.writable);

        const leitor = decoder.readable.getReader();

        let texto = "";

        while (true) {

            const { value, done } = await leitor.read();

            if (done) break;

            texto += value;

            const linhas = texto.split("\n");

            texto = linhas.pop();

            for (const linha of linhas) {

                if (linha.trim() === "ENTRADA") {
                    pessoaEntrou();
                }
            }
        }

    } catch (erro) {

        console.error(erro);

        status.textContent = "Arduino não conectado.";
    }
}