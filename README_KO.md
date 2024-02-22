# FindSuite

## Overview

Ripgrep(일명 rg)는 주로 파일에서 텍스트를 찾는 데 사용되는 강력한 명령줄 검색 도구입니다. Everything는 강력하고 빠른 윈도우용 데스크톱 검색 도구입니다.
이 2개의 프로그램을 통합하여 VS Code 를 떠나지 않고도 당신의 컴퓨터에 있는 파일과 문자열을 다루는 데 있어서 매우 강력하고 편리함을 제공합니다.
빠른 검색을 하고 싶으면 빈 공백 혹은 검색할 단어를 선택하고 단축키 (예: Ctrl+F8 or Ctrl+F10)를 누르세요. 만약 Folder 명을 검색하고 싶다면 단축키 (Ctrl+Alt+4)를 누르세요.

## Ripgrep 및 Everything 소개

[Ripgrep](https://github.com/BurntSushi/ripgrep)은 현재 디렉토리를 재귀적으로 검색하여 정규 표현식 패턴에 대한 결과를 반환하는 줄 지향 검색 도구입니다. 대규모 코드베이스를 효율적으로 탐색하는 데 사용되며 속도가 빠르고 효율적인 것으로 알려져 있습니다.
[Everything](https://www.voidtools.com/)은 Windows용 강력한 검색 유틸리티로 시스템의 모든 파일과 폴더를 색인화하여 매우 빠른 검색이 가능합니다.

FindSuite를 사용하면 Visual Studio Code 환경에서 ripgrep과 Everything의 기능을 모두 활용할 수 있습니다.

## 사전 준비 사항

이 확장 프로그램을 사용하기 전에 다음 사전 요구 사항이 설치되어 있는지 확인하세요.

- **Everything 프로그램**: 이 확장 프로그램은 빠른 파일 검색을 위해 Everything 프로그램에 의존합니다. 시스템에 설치되어 있는지 확인하세요.

![Everything](images/everything1.png)

- **VSCode Settings**: Everything 프로그램에서 설정한 Host, Port 를 입력해 주세요. 그리고 Everything Config 를 설정해 주세요.

![Setting](images/setting.png)

## 기능

### FindSuite 프로그램

파일에서 텍스트를 다루는 데 강력하고 편리한 Ripgrep 프로그램을 통합하여 VS Code 에서 쉽고 빠른 검색을 제공합니다.
폴더 혹은 파일을 찾는 데 있어서 그 무엇보다 강력한 Everything 과 연동하여 파일을 빠르고 쉽게 찾을 수 있도록 도와줍니다.

### Ripgrep 통합

이 확장 프로그램은 ripgrep과 통합되어 사용자가 특정 문자열이 포함된 파일을 효율적으로 검색할 수 있습니다.

## 단축키

- **Ctrl + F7**: ripgrep을 사용하여 현재 파일의 폴더 내에서 문자열 검색
- **Ctrl + F8**: ripgrep을 사용하여 현재 workspace에 있는 파일들 내에서 문자열 검색
- **Ctrl + Alt + 0**: ripgrep을 사용하여 현재 열려 있는 파일에서 문자열 검색

### Everything 연동

시스템의 모든 파일과 폴더를 색인화하여 매우 빠른 파일 검색 Everything 과 연동하여 VS Code 에서 빠르고 많은 파일을 쉽게 다룰 수 있습니다.

## 단축키 (Requires Everything)

- **Ctrl + F10**: Everything을 사용하여 파일 검색한 다음 선택한 파일 내에서 문자열 검색
- **Ctrl + Alt + 4**: Everything을 사용하여 검색하고 선택한 폴더 열기
- **Ctrl + Alt + Shift + w**: Everything을 사용하여 code-workspace 파일을 검색하고 Workspace 열기
- **Ctrl + Alt + F9**: Everything을 사용하여 파일 검색

이러한 단축키를 사용하면 Visual Studio Code 내에서 FindSuite가 제공하는 강력한 검색 기능에 빠르게 액세스할 수 있습니다.

## 사용법

1. **Everything 프로그램 설치**: 시스템에 Everything 프로그램이 설치되어 있는지 확인하세요.
2. **확장 프로그램 활성화**: VS Code를 시작하고 FindSuite 확장 프로그램을 활성화하세요.
3. **파일 검색 수행**:
   - 제공된 명령어, 단축키 또는 VS Code 명령 팔레트를 사용하여 파일 검색을 시작하세요.
   - 파일 이름, 파일 경로 또는 정규 표현식과 같은 원하는 검색 기준을 입력하세요.
   - 검색 결과를 직접 VS Code 내에서 확인하세요.

## Issues

Please let me know of any bugs via the issues page

## Release Notes

See [CHANGELOG.md](CHANGELOG.md)

## License

See [LICENSE](LICENSE) for more information.
