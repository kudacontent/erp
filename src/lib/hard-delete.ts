import { NextResponse } from "next/server";
import type { AuthUser } from "@/lib/auth";

/**
 * 개발 단계 전용 강제 삭제.
 *
 * 평소 이 ERP 는 회계 기록을 지우지 않는다.
 * 계약은 '취소', 거래처·직원은 '보관' 으로 남기고, 승인된 지출은 잠근다.
 * 세금계산서가 나간 계약을 지워 버리면 장부와 발행분이 어긋나고,
 * 그 차이는 한참 뒤 세무에서야 드러나기 때문이다.
 *
 * 그런데 개발 중에는 테스트 데이터가 계속 쌓이고, 그걸 못 지우면 화면을 볼 수가 없다.
 * 그래서 "지금은 개발 중" 이라고 환경변수로 명시했을 때만,
 * 최고관리자(CEO)에 한해 실제 삭제를 허용한다.
 *
 * 운영으로 넘어갈 때 ALLOW_HARD_DELETE 를 빼면 이 통로는 통째로 닫힌다.
 * "나중에 막아야지" 하고 잊어버릴 여지를 남기지 않으려고 코드가 아니라 설정으로 뒀다.
 */
export function isHardDeleteEnabled() {
  return process.env.ALLOW_HARD_DELETE === "true";
}

/** 요청이 ?hard=true 로 강제 삭제를 요구했는가 */
export function wantsHardDelete(request: Request) {
  return new URL(request.url).searchParams.get("hard") === "true";
}

/**
 * 강제 삭제를 허용할지 판단한다.
 *
 * 허용되면 null, 막아야 하면 그대로 돌려줄 응답을 반환한다.
 *   const denied = denyHardDelete(user);
 *   if (denied) return denied;
 */
export function denyHardDelete(user: AuthUser) {
  if (!isHardDeleteEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "강제 삭제가 꺼져 있습니다. 운영 환경에서는 기록을 지우지 않고 취소·보관 처리만 합니다."
      },
      { status: 403 }
    );
  }

  if (user.role !== "CEO") {
    return NextResponse.json(
      { ok: false, message: "강제 삭제는 최고관리자(CEO)만 할 수 있습니다." },
      { status: 403 }
    );
  }

  return null;
}
