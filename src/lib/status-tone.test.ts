import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getStatusTone, getRiskTone } from "./status-tone.ts";

describe("상태 색상 매핑", () => {
  test("끝난 일은 success", () => {
    for (const s of ["완료", "승인 완료", "입금 완료", "발행 완료", "재직", "활성"]) {
      assert.equal(getStatusTone(s), "success", s);
    }
  });

  test("진행 중인 일은 info", () => {
    for (const s of ["진행", "진행 중", "예정", "검토"]) {
      assert.equal(getStatusTone(s), "info", s);
    }
  });

  test("손대야 하는 일은 warning", () => {
    for (const s of ["승인 대기", "발행 대기", "입금 대기", "미확인", "후속 조치", "휴직"]) {
      assert.equal(getStatusTone(s), "warning", s);
    }
  });

  test("문제가 생긴 일은 danger", () => {
    for (const s of ["지연", "반려", "발급 실패", "연체"]) {
      assert.equal(getStatusTone(s), "danger", s);
    }
  });

  test("DB enum 값도 받는다", () => {
    assert.equal(getStatusTone("APPROVED"), "success");
    assert.equal(getStatusTone("REQUESTED"), "warning");
    assert.equal(getStatusTone("REJECTED"), "danger");
    assert.equal(getStatusTone("ISSUED"), "success");
  });

  test("공백이 여러 개여도 흡수한다", () => {
    assert.equal(getStatusTone("발행  대기"), "warning");
    assert.equal(getStatusTone(" 완료 "), "success");
  });

  test("모르는 값과 빈 값은 neutral", () => {
    assert.equal(getStatusTone("듣도보도 못한 상태"), "neutral");
    assert.equal(getStatusTone(null), "neutral");
  });

  // 이전에는 완료·지연·대기·미확인이 전부 파란 계열이라
  // 색만 봐서는 정상인지 문제인지 구분할 수 없었다.
  test("완료와 지연은 반드시 다른 색이어야 한다", () => {
    assert.notEqual(getStatusTone("완료"), getStatusTone("지연"));
    assert.notEqual(getStatusTone("완료"), getStatusTone("발행 대기"));
  });
});

describe("위험도 매핑", () => {
  test("높음은 danger, 낮음은 neutral", () => {
    assert.equal(getRiskTone("높음"), "danger");
    assert.equal(getRiskTone("보통"), "warning");
    assert.equal(getRiskTone("낮음"), "neutral");
  });
});
