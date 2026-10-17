<#
  Builds the UAply Android app on this Windows computer (no Android Studio needed). Run in PowerShell from the UAply folder:
    powershell -ExecutionPolicy Bypass -File mobile\build-android.ps1            test build (.apk) to install on your own phone
    powershell -ExecutionPolicy Bypass -File mobile\build-android.ps1 -Release   signed app bundle (.aab) to upload to Google Play

  The first run downloads two free tools into your user folder (nothing is installed system-wide, nothing is sent anywhere):
    - Java 21 (Microsoft Build of OpenJDK)       -> %USERPROFILE%\.uaply-tools\jdk-21.0.12.1+1   (about 200 MB download)
    - Google's Android command-line tools + SDK -> %LOCALAPPDATA%\Android\Sdk                    (about 156 MB + 150 MB)
  Both downloads are checked against the publisher's SHA-256 checksum before use.
  Google then shows its Android SDK License Agreement: read it and type y for each part. Only you can accept it.

  -Release, first time only: creates your Google Play upload key, mobile\android\uaply-upload-key.jks, and asks you to choose
  its password. Write the password down and back up the .jks file somewhere private (not in git, not in the UAply folder
  only): without both you cannot upload updates (Google support can reset a lost upload key, but it takes days).
  Every later upload to Google Play needs a higher versionCode: raise "versionCode" in mobile\android\app\build.gradle first.
#>
param([switch]$Release)
$ErrorActionPreference = "Stop"
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
$tools = Join-Path $env:USERPROFILE ".uaply-tools"
$sdk   = Join-Path $env:LOCALAPPDATA "Android\Sdk"
New-Item -ItemType Directory -Force $tools | Out-Null

# download once, and refuse a file whose checksum does not match the one the publisher lists
function Get-Checked($url, $sha, $out) {
  if (-not (Test-Path $out)) { Write-Host "Downloading $url"; Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing }
  $got = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()
  if ($got -ne $sha) { Remove-Item $out; throw "The download $out did not match its checksum, so it was deleted. Run the script again." }
}

# 1. Java 21 (Capacitor 7 builds need Java 21)
$jdk = Get-ChildItem $tools -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) {
  $zip = Join-Path $tools "jdk21.zip"
  Get-Checked "https://aka.ms/download-jdk/microsoft-jdk-21.0.12.1-windows-x64.zip" "192441a9d27da813bada974bb88b4cf64d37a9589ed37f204374d411ca5ce07f" $zip
  Expand-Archive $zip -DestinationPath $tools -Force; Remove-Item $zip
  $jdk = Get-ChildItem $tools -Directory -Filter "jdk-21*" | Select-Object -First 1
}
$env:JAVA_HOME = $jdk.FullName
$env:Path = (Join-Path $jdk.FullName "bin") + ";" + $env:Path

# 2. Google's Android command-line tools (sdkmanager), laid out the way Android Studio expects so it can share them later
$sdkm = Join-Path $sdk "cmdline-tools\latest\bin\sdkmanager.bat"
if (-not (Test-Path $sdkm)) {
  $zip = Join-Path $tools "cmdline-tools.zip"
  Get-Checked "https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip" "90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a" $zip
  $tmp = Join-Path $tools "cmdline-tmp"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force (Join-Path $sdk "cmdline-tools") | Out-Null
  Move-Item (Join-Path $tmp "cmdline-tools") (Join-Path $sdk "cmdline-tools\latest")
  Remove-Item $tmp -Recurse -Force; Remove-Item $zip
}
$env:ANDROID_HOME = $sdk

# 3. The license (you accept it) and the three SDK parts this project needs: Android 16 (API 36) to build against,
#    the build tools Gradle asks for, and adb (platform-tools) to install the test app on a phone over USB
if (-not (Test-Path (Join-Path $sdk "licenses\android-sdk-license"))) {
  Write-Host ""
  Write-Host "Google's Android SDK License Agreement follows. Read each part and type y then Enter to accept it."
  & $sdkm --licenses
  if (-not (Test-Path (Join-Path $sdk "licenses\android-sdk-license"))) { throw "The license was not accepted, so nothing was installed." }
}
& $sdkm "platform-tools" "platforms;android-36" "build-tools;35.0.0"
if ($LASTEXITCODE) { throw "sdkmanager could not install the SDK parts (see above)." }

# 4. Copy the current app settings (capacitor.config.json, offline screen, plugins) into the Android project
Push-Location $here
try {
  if (-not (Test-Path "node_modules")) { npm ci; if ($LASTEXITCODE) { throw "npm ci failed (see above)." } }
  npx cap sync android; if ($LASTEXITCODE) { throw "npx cap sync android failed (see above)." }
} finally { Pop-Location }

# 5. The Google Play upload key (release builds only). The password stays in this window: it is passed to Gradle in memory
#    for this one build and never written to a file.
$key = Join-Path $here "android\uaply-upload-key.jks"
if ($Release) {
  if (-not (Test-Path $key)) {
    Write-Host ""
    Write-Host "Creating your Google Play upload key. Choose a password of at least 6 characters, type it twice, and WRITE IT DOWN."
    & (Join-Path $jdk.FullName "bin\keytool.exe") -genkeypair -keystore $key -alias upload -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12 -dname "CN=UAply, O=UAply, C=US"
    if ($LASTEXITCODE -or -not (Test-Path $key)) { throw "The upload key was not created." }
    Write-Host "Saved $key . Back it up now (for example to a USB stick or a password manager), together with the password."
  }
  $sec = Read-Host "Upload key password" -AsSecureString
  $env:UAPLY_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}

# 6. Build, then say where the file is and how big it is
Push-Location (Join-Path $here "android")
try {
  if ($Release) { .\gradlew.bat bundleRelease; $out = "app\build\outputs\bundle\release\app-release.aab" }
  else          { .\gradlew.bat assembleDebug; $out = "app\build\outputs\apk\debug\app-debug.apk" }
  if ($LASTEXITCODE) { throw "The build failed (see above)." }
  $f = Get-Item $out
  Write-Host ("Built {0} ({1:N1} MB)" -f $f.FullName, ($f.Length / 1MB))
  if ($Release) { Write-Host "Upload this .aab in Play Console: Test and release, Testing, Closed testing, Create new release." }
  else { Write-Host "To try it: copy the .apk to an Android phone and open it, or with the phone on USB: $sdk\platform-tools\adb.exe install -r $($f.FullName)" }
} finally { Pop-Location; Remove-Item Env:UAPLY_KEY_PASSWORD -ErrorAction SilentlyContinue }
