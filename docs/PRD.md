# FindSuite PRD

## 문서 목적

이 문서는 현재 소스 코드를 분석해 역으로 작성한 제품 요구사항 문서입니다.

## 제품 개요

FindSuite는 VS Code의 기본 검색 경험을 보완하기 위해 외부 검색 도구를 Quick Pick 기반 워크플로로 연결하는 확장입니다. 사용자는 워크스페이스 내부뿐 아니라 사용자 지정 경로, Windows 시스템 전체 인덱스, 열린 에디터, 즐겨찾기 경로를 대상으로 파일과 텍스트를 빠르게 찾고 열 수 있습니다.

## 문제 정의

VS Code의 기본 검색은 워크스페이스 중심으로 동작하므로 다음 상황에서 불편함이 있습니다.

- 워크스페이스 밖의 파일이나 폴더를 빠르게 찾아 열기 어렵다.
- 파일 이름 검색 결과를 다시 텍스트 검색 대상으로 넘기는 흐름이 번거롭다.
- 자주 여는 파일/폴더와 과거 검색 결과를 명령 팔레트 안에서 재사용하기 어렵다.
- 검색 결과 파일을 비교하거나 Problems 항목으로 이동하는 보조 작업이 분리되어 있다.

## 목표

- Ripgrep, Fd, Everything 검색 결과를 VS Code Quick Pick으로 일관되게 제공한다.
- 선택한 파일/폴더 후보를 다시 Ripgrep 검색 대상으로 넘기는 파이프라인을 제공한다.
- 자주 사용하는 파일과 폴더를 즐겨찾기로 저장하고 검색 범위로 재사용한다.
- 검색, 파일 열기, 비교, 클립보드 복사, 문제 탐색을 키보드 중심으로 수행하게 한다.
- Windows에서는 Everything 인덱스를 활용해 워크스페이스 밖의 파일 검색 속도를 높인다.

## 비목표

- Jenkins 서버 연결, 빌드 실행, 빌드 로그 스트리밍은 현재 소스에 구현되어 있지 않다.
- 원격 저장소 검색, 원격 파일 시스템 검색, 검색 인덱스 자체 구축은 범위에 포함하지 않는다.
- 검색 결과를 별도 웹뷰나 데이터베이스에 영구 저장하는 기능은 현재 범위에 포함하지 않는다.

## 대상 사용자

- 대형 코드베이스에서 파일명과 텍스트를 자주 오가며 찾는 개발자
- 여러 프로젝트 폴더를 동시에 다루며 워크스페이스 밖 파일도 빠르게 열어야 하는 사용자
- Windows에서 Everything을 사용해 시스템 전체 파일 검색을 이미 활용하는 사용자
- VS Code Problems 목록과 열린 에디터를 키보드 중심으로 탐색하려는 사용자

## 핵심 사용자 시나리오

1. 사용자는 선택된 단어 또는 입력한 문자열로 현재 워크스페이스 전체를 Ripgrep 검색한다.
2. 사용자는 Fd로 파일 후보를 고른 뒤 선택된 파일들 안에서 다시 Ripgrep 검색을 수행한다.
3. Windows 사용자는 Everything으로 시스템 전체 파일 또는 폴더를 찾고, 선택한 결과를 열거나 텍스트 검색 대상으로 넘긴다.
4. 사용자는 자주 여는 파일/폴더를 즐겨찾기에 등록하고, 즐겨찾기 목록에서 열거나 검색 범위로 사용한다.
5. 사용자는 검색 결과, 즐겨찾기, 열린 에디터 목록에서 파일 두 개를 선택해 VS Code 또는 외부 비교 도구로 비교한다.
6. 사용자는 Problems의 오류/경고를 Quick Pick으로 훑고 다음/이전 문제로 이동한다.

## 기능 요구사항

### FR-1. Ripgrep 텍스트 검색

- 현재 파일, 현재 폴더, 워크스페이스, 즐겨찾기 경로를 대상으로 텍스트 검색을 실행해야 한다.
- 선택 영역이 있으면 검색어 입력값으로 우선 사용해야 한다.
- 일반 검색은 특수 문자를 이스케이프하고, 정규식 명령은 사용자가 입력한 패턴을 그대로 사용해야 한다.
- 검색 결과는 파일명, 줄 번호, 매칭 위치, 매칭 줄을 Quick Pick 항목으로 표시해야 한다.
- 결과 항목을 활성화하면 해당 파일을 미리 열고 매칭 범위를 하이라이트해야 한다.
- 검색 결과는 세션 내 히스토리 목록에 저장되어 다시 열 수 있어야 한다.
- 설정된 `findsuite.rg.count`를 넘는 결과는 제한해야 한다.

### FR-2. Fd 파일/폴더 검색

- Fd를 사용해 파일, 폴더, 워크스페이스 파일, `.code-workspace` 파일을 검색해야 한다.
- 플랫폼별 사용자 지정 검색 경로와 현재 워크스페이스 경로를 검색 범위로 사용할 수 있어야 한다.
- 검색 결과는 Quick Pick으로 표시하고 다중 선택 파일 열기를 지원해야 한다.
- 검색 제외 패턴은 `findsuite.fd.excludePatterns` 설정을 반영해야 한다.
- Fd 폴더 검색 결과는 선택된 폴더 안의 파일 열기 흐름으로 이어져야 한다.

### FR-3. Everything 통합

- Everything 기능은 Windows에서만 활성화되어야 한다.
- Everything HTTP 서버의 host, port, count, exclude pattern 설정을 사용해야 한다.
- 파일, 폴더, 워크스페이스 내부 파일, `.code-workspace` 파일 검색을 지원해야 한다.
- `findsuite.everythingConfig`에 정의된 커스텀 필터는 스키마 검증 후 검색 쿼리에 반영해야 한다.
- 결과 항목은 파일/폴더 타입, 크기, 경로 정보를 Quick Pick으로 표시해야 한다.
- 폴더 열기는 사용자 확인 후 `vscode.openFolder`로 수행해야 한다.

### FR-4. 검색 파이프라인

- `findsuite.rgWithFd`는 Fd 파일 검색 결과를 Ripgrep 검색 범위로 전달해야 한다.
- `findsuite.rgWithFdDir`는 Fd 폴더 검색 결과를 Ripgrep 검색 범위로 전달해야 한다.
- `findsuite.rgWithEverything`은 Everything 파일 검색 결과를 Ripgrep 검색 범위로 전달해야 한다.
- `findsuite.rgWithEverythingFolder`는 Everything 폴더 검색 결과를 Ripgrep 검색 범위로 전달해야 한다.
- Ripgrep으로 넘기는 입력 개수는 `Constants.RG_LIMITS` 이하로 제한해야 한다.

### FR-5. 즐겨찾기

- 현재 열린 파일을 즐겨찾기에 추가할 수 있어야 한다.
- 즐겨찾기는 파일과 디렉터리를 분리해 저장해야 한다.
- 파일 즐겨찾기는 설정된 카테고리를 사용하고, 디렉터리는 기본 보호 상태로 저장해야 한다.
- 즐겨찾기 목록에서 열기, 제거, 보호 토글, 경로 복사, Fd 창 열기, 비교를 수행할 수 있어야 한다.
- 즐겨찾기 저장 파일은 플랫폼별 `findsuite.path.favorites.*` 경로 아래 `favorites.json`으로 관리해야 한다.
- 최대 즐겨찾기 수는 `Constants.FAVOR_MAX`로 제한해야 한다.

### FR-6. 검색 히스토리

- Ripgrep 검색어, 검색 시각, 결과 파일 항목, 총 파일 수를 세션 내 히스토리에 저장해야 한다.
- 같은 검색어가 다시 실행되면 이전 항목을 제거하고 최신 항목으로 갱신해야 한다.
- 히스토리는 최대 `Constants.HISTORY_MAX`개까지만 유지해야 한다.
- 히스토리 상세에서 파일 열기, 경로 복사, 즐겨찾기 추가가 가능해야 한다.

### FR-7. 파일 비교

- Fd, Everything, 즐겨찾기, 열린 에디터 목록의 선택 결과로 파일 비교를 실행해야 한다.
- 내부 비교는 VS Code `vscode.diff` 명령을 사용해야 한다.
- 외부 비교가 켜져 있으면 `findsuite.compare.external.program`과 옵션으로 외부 도구를 실행해야 한다.
- 폴더 비교는 외부 비교 도구가 설정된 경우에만 허용해야 한다.

### FR-8. 문제 탐색

- 현재 파일의 오류 또는 전체 파일의 오류/경고를 Quick Pick으로 표시해야 한다.
- 항목 활성화 시 해당 위치를 미리 열고 진단 범위를 하이라이트해야 한다.
- 다음/이전 오류 이동과 파일 간 다음/이전 오류 이동을 지원해야 한다.
- VS Code의 진단 API와 마커 이동 명령을 사용해야 한다.

### FR-9. 열린 에디터 관리

- 현재 열려 있는 텍스트 문서를 확장자별로 그룹화해 Quick Pick으로 표시해야 한다.
- 선택한 에디터로 전환하거나, 경로를 복사하거나, 즐겨찾기에 추가하거나, 선택 항목을 닫을 수 있어야 한다.
- 열린 파일 두 개를 선택해 비교할 수 있어야 한다.

### FR-10. 설정과 플랫폼 처리

- 설정은 `vscode.workspace.getConfiguration('findsuite')`를 통해 읽어야 한다.
- Ripgrep과 Fd는 내장 바이너리 사용 여부를 설정으로 전환할 수 있어야 한다.
- 플랫폼별 프로그램명과 경로 설정을 분리해야 한다.
- 설정 변경 시 Fd/Ripgrep 프로그램 확인 상태를 초기화해야 한다.
- Everything 관련 명령은 Windows에서만 등록되거나 실행되어야 한다.

## 명령 범위

| 영역 | 대표 명령 |
| --- | --- |
| Ripgrep | `findsuite.rg`, `findsuite.rgws`, `findsuite.rgFile`, `findsuite.rgre`, `findsuite.rgFavorites`, `findsuite.rgHistory` |
| Fd | `findsuite.fd`, `findsuite.fdFile`, `findsuite.fdWs`, `findsuite.fdFolder`, `findsuite.fdCodeWs`, `findsuite.fd#diff` |
| Everything | `findsuite.everything`, `findsuite.incrementalEverything`, `findsuite.everything#folder`, `findsuite.everything#workspace`, `findsuite.everything#codeWorkspace` |
| 파이프라인 | `findsuite.rgWithFd`, `findsuite.rgWithFdDir`, `findsuite.rgWithEverything`, `findsuite.rgWithEverythingFolder` |
| 즐겨찾기 | `findsuite.favorites`, `findsuite.favoritesFile`, `findsuite.favoritesFileinDir`, `findsuite.addFavorite`, `findsuite.clearFavorites` |
| 문제 탐색 | `findsuite.showErrorInFile`, `findsuite.showErrorInFiles`, `findsuite.showMarkerInFiles`, `findsuite.nextError`, `findsuite.prevError` |
| 에디터 | `findsuite.editors`, `findsuite.reveal#top`, `findsuite.reveal#center` |

## UX 요구사항

- 주요 흐름은 VS Code Quick Pick과 Input Box를 사용해야 한다.
- 검색어 입력창은 현재 선택 텍스트를 기본값으로 사용할 수 있어야 한다.
- Quick Pick 항목은 파일 아이콘, 경로, 매칭 줄, 버튼 액션을 포함해야 한다.
- 긴 작업은 `withProgress` 기반 진행 상태를 보여야 한다.
- 정보/오류 메시지는 짧은 시간 동안 Status Bar 또는 VS Code 메시지로 안내해야 한다.
- 검색 결과 선택 중 미리보기와 하이라이트를 제공해 파일 이동 전에 내용을 확인할 수 있어야 한다.

## 데이터와 저장소

| 데이터 | 저장 위치 | 수명 |
| --- | --- | --- |
| 즐겨찾기 | 플랫폼별 `findsuite.path.favorites.*` 아래 `favorites.json` | 파일 영구 저장 |
| Ripgrep 히스토리 | `vscExtension._historyMap` | VS Code 세션 내 메모리 |
| 설정 | VS Code 사용자/워크스페이스 설정 | VS Code 설정 수명 |

## 아키텍처 요약

- `src/extension.ts`: 확장 활성화, 서비스 인스턴스 생성, 명령 등록, 설정 변경 감지
- `src/commands/*`: VS Code 명령 핸들러와 사용자 흐름 연결
- `src/svc/ripgrep.ts`: Ripgrep 실행, JSON 결과 파싱, Quick Pick 결과 구성, 하이라이트
- `src/svc/fd.ts`: Fd 실행, 파일/폴더 결과 구성, 워크스페이스 파일 열기
- `src/svc/everything.ts`: Everything HTTP API 호출, 필터 쿼리 구성, 파일/폴더 열기
- `src/svc/favorite-manager.ts`: 즐겨찾기 저장/로드/수정
- `src/svc/problem-manager.ts`: VS Code Diagnostic 탐색과 하이라이트
- `src/svc/diff.ts`: VS Code 또는 외부 도구 기반 비교 실행
- `src/config/settings.ts`: 설정 조회, Everything 설정 스키마 검증, 플랫폼별 설정 처리
- `src/model/*`: Quick Pick 항목과 검색 쿼리 타입 정의

## 비기능 요구사항

- 검색 명령 실행은 VS Code UI를 장시간 블로킹하지 않도록 진행 상태를 제공해야 한다.
- Fd와 Ripgrep은 대량 출력에 대비해 충분한 `maxBuffer`를 사용해야 한다.
- Ripgrep 결과, Everything 다중 열기, 파이프라인 입력은 설정 또는 상수로 제한해 과도한 파일 열기를 방지해야 한다.
- Windows 외 플랫폼에서 Everything 명령은 사용자에게 지원 불가 메시지를 보여야 한다.
- 경로에 공백이 있는 경우 검색 도구에 전달하기 전에 적절히 따옴표 처리해야 한다.

## 성공 지표

- 사용자가 주요 파일 검색과 텍스트 검색을 명령 팔레트 또는 단축키로 3단계 이내에 실행한다.
- `fd | rg`, `everything | rg` 흐름에서 파일 후보 선택 후 텍스트 검색까지 한 화면 흐름으로 이어진다.
- 즐겨찾기에 등록한 파일/폴더를 Quick Pick에서 즉시 재사용할 수 있다.
- 검색 결과에서 파일 열기, 경로 복사, 즐겨찾기 추가, 비교가 별도 명령 탐색 없이 가능하다.

## 알려진 제약과 개선 후보

- Jenkins 관련 기능은 현재 구현되어 있지 않으므로 별도 제품 요구사항과 소스 구조가 필요하다.
- Ripgrep 히스토리는 메모리 기반으로 보이며 VS Code 재시작 후 복원되지 않는다.
- 일부 사용자-facing 문자열은 영어로 하드코딩되어 있어 현지화 일관성이 낮다.
- child process 명령 문자열 조합이 여러 곳에 존재하므로 경로/인자 이스케이프 안정성 점검이 필요하다.
- Everything은 HTTP 서버 설정과 외부 프로그램 설치 상태에 강하게 의존한다.
- README_KO.md는 현재 인코딩이 깨져 보이는 구간이 있어 별도 정리가 필요하다.
