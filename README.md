# SEOUL 2026 | 위탁교육 관리 시스템

서울 2026 프로젝트의 효율적인 운영과 성과 분석을 위해 개발된 고성능 대시보드 및 리포팅 시스템입니다.

## 🚀 주요 기능

- **통합 상황판 (Executive Dashboard)**: 전체 사업의 예산 집행률, 업체 현황, 설문 점수 및 ROI 실시간 모니터링.
- **계층형 사업 관리 (LV1~LV3)**: 유연한 계층 구조를 통한 사업 분류 및 간트 차트(Timeline View) 지원.
- **예산 및 지출 관리**: 예산 항목별 배정액/집행액 관리 및 증빙 파일 자동 리네이밍 기반 지출 결의서 지원.
- **AI 성과 분석 보고서**: 설문 전수 데이터를 기반으로 한 AI 성과 지표 산출 및 인쇄용 고해상도 PDF 리포트.
- **협력업체 명부 관리**: 업체별 문서(사업자등록증, 통장사본), 계약서 통합 관리 및 하위 사업 계승.
- **데이터 백업 및 이전**: 시스템 전체 상태를 JSON 파일로 추출 및 복원하는 기능 제공.

## 🛠 기술 스택

- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **State Management**: Zustand (with Persist Middleware)
- **Visualization**: Recharts (Charts), CSS Grid/Flex for Gantt
- **Utilities**: `xlsx` (Excel Export), `clsx`, `tailwind-merge`

## 📦 설치 및 실행

1. **의존성 설치**:
   ```bash
   npm install
   ```
2. **개발 서버 실행**:
   ```bash
   npm run dev
   ```
3. **프로덕션 빌드**:
   ```bash
   npm run build
   ```

## 💾 데이터 관리 및 보안 (LocalStorage)

본 시스템은 별도의 서버 데이터베이스 없이 브라우저의 **LocalStorage**에 모든 데이터를 저장합니다.
- 장점: 빠른 속도, 개인화된 데이터 유지, 네트워크 독립적.
- 주의사항: 브라우저 캐시 삭제 시 데이터가 소실될 수 있으므로 **환경설정** 메뉴에서 정기적인 **JSON 백업**을 권장합니다.

## 📄 라이선스

Copyright © 2026 Admin. All rights reserved.
