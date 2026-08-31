-- 계약 금액을 만원 단위에서 원 단위로 바꾼다.
--
-- 그동안 계약 등록 폼이 "단위: 만원" 으로 입력을 받아 그 숫자를 그대로 저장했다.
-- 즉 250 은 250만원(2,500,000원)을 뜻했다.
-- 반면 지출·세금계산서는 원 단위로 저장하고 있어서 두 단위가 섞여 있었다.
--
-- 이 마이그레이션 이후로는 모든 금액이 원 단위다.
UPDATE "ProjectContract"
SET
  "contractAmount" = "contractAmount" * 10000,
  "vatAmount"      = "vatAmount" * 10000,
  "totalAmount"    = "totalAmount" * 10000;
