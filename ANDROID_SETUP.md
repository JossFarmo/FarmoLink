# Preparar projeto Android (Windows)

Este arquivo descreve os passos para preparar o ambiente no Windows e gerar um APK/AAB a partir do projeto Capacitor + Vite.

Resumo rápido:
- Instalear o Android Studio (inclui Android SDK)
- Instalar JDK (Java) e configurar `JAVA_HOME`
- Configurar `ANDROID_SDK_ROOT` (ou `ANDROID_HOME`) ou criar `android/local.properties`
- Gerar build web (`npm run build`)
- Sincronizar com Capacitor (`npx cap copy android`)
- Abrir no Android Studio ou rodar Gradle para gerar APK

1) Instalar Android Studio
- Baixe e instale Android Studio do site oficial.
- No instalador selecione o Android SDK e o Android SDK Platform-tools.

2) Instalar JDK (Java)
- Recomenda-se JDK 11 ou 17. Instale a versão adequada e configure a variável de ambiente `JAVA_HOME` apontando para a pasta do JDK (por exemplo: `C:\Program Files\Java\jdk-17`).

3) Configurar variáveis de ambiente (exemplo no Windows):
- Abra "Editar variáveis de ambiente do sistema" -> Variáveis de Ambiente
- Adicione/atualize:
  - `JAVA_HOME` = C:\Program Files\Java\jdk-17
  - `ANDROID_SDK_ROOT` = C:\Users\<SeuUsuario>\AppData\Local\Android\Sdk
  - Adicione `%ANDROID_SDK_ROOT%\platform-tools` ao `PATH`

4) Alternativa rápida: criar `local.properties`
- Se não quiser mexer em variáveis do sistema agora, crie o arquivo `android/local.properties` com uma linha:

  sdk.dir=C:\Users\<SeuUsuario>\AppData\Local\Android\Sdk

  Substitua `<SeuUsuario>` pelo seu nome de usuário Windows e verifique o caminho do SDK.

5) Gerar build web e copiar para Android (no diretório do projeto):

  npm run build
  npx cap copy android

6) Gerar APK de debug (local):
- Usando Gradle (linha de comando):

  cd android
  .\gradlew.bat assembleDebug

- O APK gerado normalmente estará em `android\app\build\outputs\apk\debug\app-debug.apk`.

7) Gerar APK/AAB de release (assinatura)
- Gere uma keystore (exemplo):

  keytool -genkeypair -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

- Configure o `signingConfigs` em `android/app/build.gradle` ou use o GUI do Android Studio (File -> Generate Signed Bundle / APK).

8) Abrir Android Studio (recomendado)
- No projeto, execute `npx cap open android` para abrir o projeto nativo no Android Studio.
- No Android Studio: Build -> Generate Signed Bundle / APK para gerar um AAB/APK assinado.

Notas e soluções de erros comuns
- Erro "SDK location not found": configure `ANDROID_SDK_ROOT` ou `local.properties` como mostrado.
- Erro relacionado ao Java: verifique `JAVA_HOME` e que `java -version` aponta para o JDK.
- Lembre-se de rodar `npm run build` sempre que fizer alterações no frontend antes de `npx cap copy android`.

Comandos úteis resumidos

  npm install
  npm run build
  npx cap copy android
  npx cap open android    # abre Android Studio
  # ou (linha de comando)
  cd android
  .\gradlew.bat assembleDebug

Se quiser, posso:
- gerar automaticamente um `android/local.properties` com o caminho que você indicar
- criar um script npm para automatizar build + cap copy + assemble
- orientá-lo passo a passo para criar a keystore e configurar o release
