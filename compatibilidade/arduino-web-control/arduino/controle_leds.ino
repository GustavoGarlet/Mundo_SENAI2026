const byte LED_VERMELHO = 8;
const byte LED_VERDE = 9;
const byte LED_AZUL = 10;

String comandoRecebido = "";

void responderEstado() {
  Serial.print("STATE:");
  Serial.print(digitalRead(LED_VERMELHO));
  Serial.print(",");
  Serial.print(digitalRead(LED_VERDE));
  Serial.print(",");
  Serial.println(digitalRead(LED_AZUL));
}

void executarComando(String comando) {
  comando.trim();

  if (comando == "RED_ON") {
    digitalWrite(LED_VERMELHO, HIGH);
  } else if (comando == "RED_OFF") {
    digitalWrite(LED_VERMELHO, LOW);
  } else if (comando == "GREEN_ON") {
    digitalWrite(LED_VERDE, HIGH);
  } else if (comando == "GREEN_OFF") {
    digitalWrite(LED_VERDE, LOW);
  } else if (comando == "BLUE_ON") {
    digitalWrite(LED_AZUL, HIGH);
  } else if (comando == "BLUE_OFF") {
    digitalWrite(LED_AZUL, LOW);
  } else if (comando == "ALL_ON") {
    digitalWrite(LED_VERMELHO, HIGH);
    digitalWrite(LED_VERDE, HIGH);
    digitalWrite(LED_AZUL, HIGH);
  } else if (comando == "ALL_OFF") {
    digitalWrite(LED_VERMELHO, LOW);
    digitalWrite(LED_VERDE, LOW);
    digitalWrite(LED_AZUL, LOW);
  } else if (comando == "STATUS") {
    responderEstado();
    return;
  } else {
    Serial.println("ERROR:Comando desconhecido");
    return;
  }

  responderEstado();
}

void setup() {
  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AZUL, OUTPUT);

  digitalWrite(LED_VERMELHO, LOW);
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AZUL, LOW);

  Serial.begin(9600);
  Serial.setTimeout(50);
  Serial.println("READY");
}

void loop() {
  while (Serial.available() > 0) {
    char caractere = Serial.read();

    if (caractere == '\n') {
      executarComando(comandoRecebido);
      comandoRecebido = "";
    } else if (caractere != '\r') {
      if (comandoRecebido.length() < 40) {
        comandoRecebido += caractere;
      } else {
        comandoRecebido = "";
        Serial.println("ERROR:Comando muito longo");
      }
    }
  }
}
