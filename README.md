# 내 이동 매니저

귀가 시한·운영시간·에너지 제약을 함께 계산하고 가능한 대안을 선택합니다.

**오프라인 기능 시뮬레이션입니다. 실제 Gleo·Vehicle SDK·실차 제어·지도·교통·날씨·음성 AI는 미연동입니다.** 정차 상태의 탐색용 데모이며 주행 중 사용 검증을 수행하지 않았습니다.

팀명: **더 많은 사이**. v0.1.1은 제출자료 파일명 정리 Release이며 APK 앱버전은 **0.1.0(1)**로 동일합니다.

## 다운로드 및 실행

- [서명된 APK](apk/%EB%8D%94%20%EB%A7%8E%EC%9D%80%20%EC%82%AC%EC%9D%B4_%EB%82%B4%EC%9D%B4%EB%8F%99%EB%A7%A4%EB%8B%88%EC%A0%80_release.apk) · [Release APK](https://github.com/wamma/pleos-mobility-manager/releases/download/v0.1.1/deomaneunsai_mobility_release.apk)
- [시연 영상](https://github.com/wamma/pleos-mobility-manager/releases/download/v0.1.1/demo.mp4) · [세로 숏폼 영상 파일](https://github.com/wamma/pleos-mobility-manager/releases/download/v0.1.1/shortform.mp4) · [소스 ZIP](https://github.com/wamma/pleos-mobility-manager/releases/download/v0.1.1/pleos-mobility-manager-source-v0.1.1.zip)
- [v0.1.1 제출자료 Release](https://github.com/wamma/pleos-mobility-manager/releases/tag/v0.1.1)

숏폼 링크는 GitHub의 영상 파일 다운로드이며 YouTube/Instagram 게시 URL이 아닙니다. 두 영상 모두 일반 Android API34 에뮬레이터의 실제 APK 화면을 녹화했습니다.

```sh
adb -s <emulator-serial> install -r "더 많은 사이_내이동매니저_release.apk"
adb -s <emulator-serial> shell am start -n local.pleos.idealab.mobility/local.pleos.idealab.MainActivity
```

APK 다운로드 폴더에서 실행합니다. 앱 내부 흐름: 시간 부족 시나리오 → 대안 선택 → 계획 확정 → 방문과 완료를 따로 확인. 개발 PC의 웹 서버나 네트워크 연결 없이 실행됩니다. 외부 차량 설명서 링크는 별도 브라우저와 네트워크가 필요합니다.

Release 첨부는 GitHub의 한글 파일명 정규화 때문에 영문 이름을 사용합니다. 공식 제출용 한글 파일명은 저장소 APK 다운로드에 유지되며 두 파일의 SHA256은 같습니다.

## 구현과 검증 범위

Java Activity가 APK에 포함된 HTML/JS를 WebView로 실행합니다. 버전0.1.0(1), minSdk28, targetSdk34, compileSdk35, release non-debuggable. 입력·계산·차량 관찰값은 모의 데이터입니다. 사용자 경로 학습·Gleo 대화/콜백·실제 차량 제어는 향후 연동 범위입니다.

공식 Pleos Connect2.1.0 API34 arm64 이미지의 SHA1 확인 후 2560×1440/density160, Pleos WebView131.0.6752.0에서 설치·정상/예외·터치/스크롤·입력·오프라인·뒤로가기·상담기록 재실행 유지 흐름을 확인했습니다. 일반 Android API34에서도 확인했습니다. 이는 실차나 Gleo 연동 검증을 뜻하지 않습니다. 공통 로직 단위22개와 브라우저 흐름8개가 기존 제작 검증에서 통과했습니다.

세 아이디어는 같은 계산·UI 코드 기반에서 검증되었으므로 세 flavor와 공통 테스트를 보존했습니다. 이 저장소의 주인공은 **내 이동 매니저**이며 배포 APK는 `mobility` 하나입니다. 다른 flavor 소스가 있어도 이 APK는 해당 화면만 엽니다. 지도 대신 동일 구간 시간 모델, 수동 상태 확인, 시뮬레이션 시간 진행을 사용합니다.

## 해당 앱 빌드

JDK17, Android SDK35/build-tools35.0.0, Gradle8.12(wrapper), AGP8.9.1이 필요합니다. ANDROID_HOME 또는 로컬 android/local.properties로 SDK 경로를 설정합니다.

```sh
python3 scripts/prepare-signing.py
# 출력된 로컬 properties 경로를 PLEOS_SIGNING_PROPERTIES에 설정합니다. 파일 내용과 키는 공개하지 않습니다.
cd android
./gradlew assembleMobilityRelease
```

서명 환경변수가 없으면 unsigned 결과입니다. 개인별 새 개발용 서명은 배포 APK의 서명과 다릅니다. 빌드 결과는 `android/app/build/outputs/apk/mobility/release/`에 있습니다. 패키지 assets와 소스 일치·서명·패키지 검증은 `python3 scripts/verify-apks.py`를 실행합니다. 재빌드 파일 검증 시 먼저 `apk/더 많은 사이_내이동매니저_release.apk`에 검증할 서명본을 복사하세요.

## 웹 개발과 테스트

```sh
npm ci
npm start
npm test
npm run check
npx playwright test
```

Node22+와 브라우저 테스트용 Google Chrome이 필요합니다. 개발 웹 주소는 http://127.0.0.1:4173/?idea=mobility&single=1 입니다. 브라우저 테스트는 공통 세 아이디어를 검증합니다. 캡처는 test-results/screenshots에 저장되며 PLEOS_SCREENSHOT_DIR로 변경할 수 있습니다.

[공식 연동 조사 및 제한](docs/integration-research.md). 접수양식·참가자 정보·서명·메일·로컬 증거 자료는 공개 소스에 포함하지 않습니다.
