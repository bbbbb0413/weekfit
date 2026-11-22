package com.modi.avatar;

/**
 * 아바타에 입힐 옷 한 벌의 그림.
 *
 * @param svg         캐릭터 캔버스(viewBox) 기준 SVG. AI가 못 그렸으면 null 이고 화면은 옷 색으로 칠한다
 * @param aiAvailable AI가 그린 그림이면 true
 */
public record AvatarPaint(String svg, boolean aiAvailable) {
}
