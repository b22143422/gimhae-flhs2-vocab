# 김해외고2 영어 단어 암기장

심영(1~3반)과 심영작(공통)의 범위별 단어·표현을 학습하는 React + Vite 프로젝트입니다.

## 내 컴퓨터에서 확인하기

Node.js 24 LTS를 사용합니다. ZIP을 풀고 package.json이 있는 폴더에서 터미널을 엽니다.

```bash
npm ci
npm run dev
```

터미널의 Local 주소를 브라우저에서 엽니다. 배포 파일은 `npm run build`로 만들고 `npm run preview`로 확인할 수 있습니다.

## GitHub에 업로드하고 Pages로 배포하기

1. GitHub에서 새 공개 저장소를 만듭니다. 아래 명령으로 올릴 때는 README 초기화 옵션을 끈 채로 저장소를 생성합니다.
2. ZIP을 푼 뒤 `package.json`과 `.github`가 같은 위치에 있는 프로젝트 폴더에서 터미널을 엽니다. 아래 주소를 본인 저장소 주소로 바꿔 실행합니다.

   ```bash
   git init -b main
   git add .
   git commit -m "Add vocabulary study site"
   git remote add origin https://github.com/사용자명/저장소명.git
   git push -u origin main
   ```

   GitHub Desktop을 사용한다면 압축을 푼 프로젝트를 로컬 저장소로 만든 다음 Commit과 Publish를 실행합니다. 웹에서 직접 올리는 경우 저장소 루트에 프로젝트 내용물을 올리고, 숨김 폴더가 누락됐다면 GitHub에서 `.github/workflows/deploy.yml` 파일을 생성해 ZIP의 같은 파일 내용을 붙여 넣습니다.

3. 저장소 **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
4. **Actions → Deploy to GitHub Pages → Run workflow → main → Run workflow**를 실행합니다. 설정 전에 자동 실행이 실패했더라도 이 단계에서 다시 실행할 수 있습니다.
5. 완료 후 **Settings → Pages**에 표시된 주소를 엽니다. 이후 `main`에 올리는 변경 사항은 자동으로 배포됩니다.

[GitHub Pages 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) · [Vite 배포 가이드](https://vite.dev/guide/static-deploy#github-pages)

## 범위 추가하기

`src/data/words.json`에서 과목의 해당 자료 유형 아래 `parts`에 범위를 추가합니다. 각 항목은 영문 `en`, 한국어 뜻 `ko`, 출처 표기 `location`으로 구성됩니다. 아티클은 심영의 아티클 그룹에, Mini Test 2는 심영작의 수특 영독연 그룹에 추가하면 드롭다운과 시험에 반영됩니다.

시험에서 한국어 복수 뜻은 자료에 쉼표 등으로 나열된 표기와 괄호 설명을 뺀 표기를 허용합니다. 한국어 뜻이 일치하는 영문 답은 함께 인정합니다. 영어는 대소문자와 연속 공백을 정리해서 비교합니다. 출제 범위는 선택한 범위이며, 4지선다의 오답 선지는 동일 과목의 다른 범위에서 가져옵니다.
