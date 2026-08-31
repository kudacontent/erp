-- 거래처에 보관(ARCHIVED) 상태를 추가한다.
-- 거래처를 실제로 삭제하면 계약·세금계산서 이력이 끊기므로,
-- 삭제 요청은 상태 변경으로 처리하고 목록에서만 감춘다.
ALTER TABLE "Client" ADD COLUMN "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE';

-- 목록은 항상 ACTIVE 만 조회하므로 인덱스를 둔다.
CREATE INDEX "Client_status_idx" ON "Client"("status");
