# Playarr TV App

### Notes to get running...
I've had a lot of issues getting this to build on new systems, so here's a list of things to get it working after cloning

- Install **JDK 17** (e.g. [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=17)) — Android/Gradle builds require JDK 17. JetBrains Runtime (bundled with IntelliJ/Android Studio) is too new and will cause `Unsupported class file major version` errors.
- Add `org.gradle.java.home` to [gradle.properties](android/gradle.properties) pointing to your JDK 17 installation:
  ```properties
  org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot
  ```
- Update the [gradle-wrapper.properties](android/gradle/wrapper/gradle-wrapper.properties) `distributionUrl` to use `gradle-8.14.4-bin.zip` (expo prebuild generates it with 9.0.0 which doesn't work).
- Delete `node_modules` and reinstall after changing Java/Gradle configuration to clear stale gradle plugin build caches that get stored inside `node_modules`.
