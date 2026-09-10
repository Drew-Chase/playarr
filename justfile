# Playarr TV — task runner
# Docs: https://github.com/casey/just
#
# Everyday flow:
#   just emulator        # start the Android TV emulator
#   just start           # Metro dev server (hot reload)
#   just build launch    # install the dev client on the emulator
#   just check           # typecheck + lint
#
# First-time machine setup: just setup-sdk install-image create-avd

set shell := ["bash", "-cu"]

# ---- toolchain -----------------------------------------------------------------

java_home := "/usr/lib/jvm/java-17-openjdk"
android_home := env("ANDROID_HOME", env("HOME") + "/Android/Sdk")
sdkmanager := android_home + "/cmdline-tools/latest/bin/sdkmanager"
avdmanager := android_home + "/cmdline-tools/latest/bin/avdmanager"
emulator_bin := android_home + "/emulator/emulator"
adb := android_home + "/platform-tools/adb"

avd_name := "Playarr_TV"
api := "36"
package := "com.anonymous.playarrtv"
activity := package + "/.MainActivity"

export JAVA_HOME := java_home
export ANDROID_HOME := android_home
export EXPO_TV := "1"
export PATH := android_home + "/platform-tools:" + android_home + "/emulator:" + env("PATH")

# ---- default -------------------------------------------------------------------

default:
    @just --list

# list available recipes
@list:
    just --list

# ---- dependencies ---------------------------------------------------------------

# install npm dependencies
install:
    npm install

# regenerate the android/ project (destroys manual android changes)
prebuild:
    npx expo prebuild --clean -p android

# ---- dev server -----------------------------------------------------------------

# start Metro with hot reload (dev client)
start:
    npx expo start --dev-client

# start Metro with a cleared cache
start-clear:
    npx expo start --dev-client --clear

# ---- build / run -----------------------------------------------------------------

# build + install the debug APK on the running emulator (incremental)
build:
    ./android/gradlew -p android :app:installDebug

# full build + install + launch via expo cli
run:
    npx expo run:android

# launch the app on the emulator
launch:
    {{adb}} shell am start -n {{activity}}

# force-stop the app
stop:
    {{adb}} shell am force-stop {{package}}

# force-stop then relaunch the app
reload: stop launch

# ---- emulator --------------------------------------------------------------------

# boot the Android TV emulator (cold boot ~1 min; never launch two at once)
emulator:
    {{emulator_bin}} -avd {{avd_name}} -gpu host -no-snapshot

# boot reusing the last saved state (only if the previous exit was clean)
emulator-fast:
    {{emulator_bin}} -avd {{avd_name}} -gpu host

# shut the emulator down (saves a snapshot for fast reboots)
emulator-kill:
    {{adb}} -s emulator-5554 emu kill

# list connected devices/emulators
device:
    {{adb}} devices

# restore host<->emulator port forwarding (run after every emulator boot)
reverse:
    {{adb}} reverse tcp:8081 tcp:8081
    {{adb}} reverse tcp:65267 tcp:65267

# ---- adb helpers ------------------------------------------------------------------

# stream React Native JS logs
log:
    {{adb}} logcat -s ReactNativeJS:V

# capture a screenshot as ./<name>.png
screenshot name="screenshot":
    {{adb}} exec-out screencap -p > {{name}}.png

# send a keyevent (e.g. just key KEYCODE_DPAD_DOWN)
key key:
    {{adb}} shell input keyevent {{key}}

# dump the view hierarchy to ./ui.xml (shows which element has focus)
uidump:
    {{adb}} shell uiautomator dump /sdcard/ui.xml
    {{adb}} cat /sdcard/ui.xml > ui.xml

# walk a fixed dpad sequence (nav regression smoke test)
nav-test:
    #!/usr/bin/env bash
    set -e
    for key in KEYCODE_DPAD_DOWN KEYCODE_DPAD_CENTER KEYCODE_BACK KEYCODE_DPAD_DOWN; do
        {{adb}} shell input keyevent "$key"
        sleep 1.5
    done
    {{adb}} exec-out screencap -p > nav-test.png
    echo "screenshot: nav-test.png"

# ---- pairing -----------------------------------------------------------------------

# open http://localhost:65267 on this machine (or `just forward-pair` first for phones)
pair-open:
    xdg-open http://localhost:65267

# expose the pairing server to other devices on the LAN (requires `adb -a nodaemon server`)
forward-pair:
    {{adb}} forward --remove tcp:65267 || true
    {{adb}} forward tcp:65267 tcp:65267

# ---- quality -----------------------------------------------------------------------

# typescript check
typecheck:
    npx tsc --noEmit

# eslint via expo
lint:
    npx expo lint

# typecheck + lint
check: typecheck lint

# ---- design ------------------------------------------------------------------------

# re-extract design/template.html + design/logic.js from Playarr TV.html
extract-design:
    node tools/extract-design.mjs

# ---- hyprland -----------------------------------------------------------------------

# re-apply the emulator window rules (needed after a Hyprland reload)
hyprrule:
    hyprctl eval 'hl.window_rule({name = "playarr-emulator-input", match = { class = "Emulator" }, no_initial_focus = true, tile = true})'

# ---- one-time machine setup ----------------------------------------------------------

# install the android sdk components (cmdline-tools + jdk must exist first)
install-image:
    yes | {{sdkmanager}} --licenses
    {{sdkmanager}} --install "platform-tools" "platforms;android-{{api}}" "build-tools;{{api}}.0.0" "emulator" "system-images;android-{{api}};android-tv;x86_64"

# create the Playarr_TV AVD (1080p TV)
create-avd:
    echo no | {{avdmanager}} create avd -n {{avd_name}} -k "system-images;android-{{api}};android-tv;x86_64" -d tv_1080p

# verify the toolchain is complete
doctor:
    #!/usr/bin/env bash
    set -e
    java -version
    test -x {{sdkmanager}} && echo "cmdline-tools: ok"
    test -d {{android_home}}/system-images/android-{{api}}/android-tv && echo "tv system image: ok"
    {{avdmanager}} list avd | grep -q {{avd_name}} && echo "avd {{avd_name}}: ok"
    test -d node_modules && echo "node_modules: ok"
    {{adb}} devices

# ---- git ------------------------------------------------------------------------------

# stage everything and commit with a message
commit message:
    git add -A
    git commit -m "{{message}}"

# push the tv-app branch to origin
push:
    git push origin tv-app
