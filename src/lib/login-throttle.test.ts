import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkLoginAllowed, recordLoginFailure, clearLoginFailures, loginThrottleKey } from "./login-throttle.ts";

describe("로그인 시도 제한", () => {
  test("처음에는 허용한다", () => {
    const key = `t1-${Math.random()}`;
    assert.equal(checkLoginAllowed(key).allowed, true);
  });

  test("8회 실패하면 막는다", () => {
    const key = `t2-${Math.random()}`;

    for (let i = 0; i < 7; i += 1) {
      recordLoginFailure(key);
      assert.equal(checkLoginAllowed(key).allowed, true, `${i + 1}회차는 아직 허용`);
    }

    recordLoginFailure(key);

    const result = checkLoginAllowed(key);
    assert.equal(result.allowed, false, "8회차부터 차단");
    assert.ok(result.retryAfterSeconds > 0, "다시 시도할 시각을 알려준다");
  });

  test("로그인에 성공하면 기록이 지워진다", () => {
    const key = `t3-${Math.random()}`;

    for (let i = 0; i < 8; i += 1) recordLoginFailure(key);
    assert.equal(checkLoginAllowed(key).allowed, false);

    clearLoginFailures(key);
    assert.equal(checkLoginAllowed(key).allowed, true);
  });

  test("IP 와 계정을 함께 식별한다", () => {
    const request = new Request("https://example.test/api/auth/login", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" }
    });

    assert.equal(loginThrottleKey(request, "A@Example.com"), "203.0.113.5::a@example.com");
  });

  test("다른 계정은 서로 영향을 주지 않는다", () => {
    const a = `t4a-${Math.random()}`;
    const b = `t4b-${Math.random()}`;

    for (let i = 0; i < 8; i += 1) recordLoginFailure(a);

    assert.equal(checkLoginAllowed(a).allowed, false);
    assert.equal(checkLoginAllowed(b).allowed, true);
  });
});
