# Mundo_SENAI2026



Induino 

const int botao = 2;
const int led = 13;

void setup() {
  pinMode(botao, INPUT_PULLUP);
  pinMode(led, OUTPUT);

  Serial.begin(9600);

  Serial.println("Sistema iniciado");
  Serial.println("Aguardando cartao RFID...");
}

void loop() {

  // Botão pressionado = cartão RFID detectado
  if (digitalRead(botao) == LOW) {

    Serial.println("RFID_DETECTADO");

    // Acende o LED
    digitalWrite(led, HIGH);

    // Mantém o LED aceso por 2 segundos
    delay(2000);

    // Apaga o LED
    digitalWrite(led, LOW);

    // Evita várias leituras do mesmo clique
    delay(500);
  }
}
<!--  -->