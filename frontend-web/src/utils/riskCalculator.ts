export interface RiskCalculationInput {
  baseTypeScore: number;              // Tối đa 30đ
  areaM2: number;                     // Quy mô diện tích
  floors: number;                     // Số tầng
  missingOrExpiredEquipRatio: number; // Tỷ lệ thiết bị thiếu/hết hạn (0.0 -> 1.0)
  majorViolationCount12m: number;     // Số vi phạm nghiêm trọng 12 tháng (+8đ/lỗi)
  minorViolationCount12m: number;     // Số vi phạm thường 12 tháng (+3đ/lỗi)
  fireIncidentCount12m: number;       // Số sự cố cháy nổ 12 tháng (+10đ/vụ)
}

export function calculateRiskScoreAndLevel(input: RiskCalculationInput): {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
} {
  const typeScore = Math.min(30, Math.max(0, input.baseTypeScore));

  let scaleScore = 5;
  if (input.areaM2 > 5000 || input.floors >= 7) scaleScore = 20;
  else if (input.areaM2 >= 1000) scaleScore = 15;
  else if (input.areaM2 >= 300) scaleScore = 10;

  const equipmentScore = Math.min(25, Math.round(input.missingOrExpiredEquipRatio * 25));

  const historyRaw =
    input.majorViolationCount12m * 8 +
    input.minorViolationCount12m * 3 +
    input.fireIncidentCount12m * 10;
  const historyScore = Math.min(25, historyRaw);

  const totalScore = Math.min(100, typeScore + scaleScore + equipmentScore + historyScore);

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (totalScore >= 65) riskLevel = 'HIGH';
  else if (totalScore >= 35) riskLevel = 'MEDIUM';

  return { score: totalScore, riskLevel };
}
