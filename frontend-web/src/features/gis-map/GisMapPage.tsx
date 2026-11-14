import { useState } from 'react';
import { GisMapContainer, GisFacilityPoint } from './GisMapContainer';
import { Flame, MapPin, Filter } from 'lucide-react';

// Dữ liệu mẫu 10 cơ sở PCCC đại diện thực tế tại TP.HCM (đồng bộ với Seed Neon Cloud)
const DEMO_FACILITIES: GisFacilityPoint[] = [
  {
    id: 'fac-001',
    code: 'CS-Q1-001',
    name: 'Tòa nhà Saigon Tower & TTTM Vincom Center',
    address: '72 Lê Thánh Tôn, Bến Nghé',
    district: 'Quận 1',
    latitude: 10.7781,
    longitude: 106.7022,
    riskLevel: 'HIGH',
    riskScore: 82,
  },
  {
    id: 'fac-002',
    code: 'CS-Q1-002',
    name: 'Khách sạn Caravelle Saigon',
    address: '19-23 Lam Sơn, Bến Nghé',
    district: 'Quận 1',
    latitude: 10.7766,
    longitude: 106.7032,
    riskLevel: 'MEDIUM',
    riskScore: 54,
  },
  {
    id: 'fac-003',
    code: 'CS-Q3-001',
    name: 'Bệnh viện Tai Mũi Họng TP.HCM',
    address: '155B Trần Quốc Thảo, Phường 9',
    district: 'Quận 3',
    latitude: 10.7854,
    longitude: 106.6853,
    riskLevel: 'LOW',
    riskScore: 28,
  },
  {
    id: 'fac-004',
    code: 'CS-Q7-001',
    name: 'Trung tâm Hội chợ và Triển lãm Sài Gòn (SECC)',
    address: '799 Nguyễn Văn Linh, Tân Phú',
    district: 'Quận 7',
    latitude: 10.7303,
    longitude: 106.7219,
    riskLevel: 'MEDIUM',
    riskScore: 61,
  },
  {
    id: 'fac-005',
    code: 'CS-Q7-002',
    name: 'Kho vận & Nhà xưởng Tân Thuận',
    address: 'Đường Tân Thuận, KCX Tân Thuận',
    district: 'Quận 7',
    latitude: 10.7588,
    longitude: 106.7352,
    riskLevel: 'HIGH',
    riskScore: 88,
  },
  {
    id: 'fac-006',
    code: 'CS-TD-001',
    name: 'Nhà máy Sản xuất Điện tử Samsung HCMC CE Complex',
    address: 'Khu Công nghệ cao, Tăng Nhơn Phú B',
    district: 'TP. Thủ Đức',
    latitude: 10.8495,
    longitude: 106.7915,
    riskLevel: 'MEDIUM',
    riskScore: 48,
  },
  {
    id: 'fac-007',
    code: 'CS-TD-002',
    name: 'Tổng kho Xăng dầu Cát Lái',
    address: 'Đường K1, Cảng Cát Lái, Thạnh Mỹ Lợi',
    district: 'TP. Thủ Đức',
    latitude: 10.7622,
    longitude: 106.7891,
    riskLevel: 'HIGH',
    riskScore: 94,
  },
  {
    id: 'fac-008',
    code: 'CS-BT-001',
    name: 'Chợ đầu mối Nông sản Bình Điền',
    address: 'Đại lộ Nguyễn Văn Linh, Khu phố 6',
    district: 'Bình Tân',
    latitude: 10.7102,
    longitude: 106.6214,
    riskLevel: 'HIGH',
    riskScore: 79,
  },
  {
    id: 'fac-009',
    code: 'CS-BT-002',
    name: 'Trường Đại học GTVT TP.HCM (Cơ sở 3)',
    address: 'Hồ Học Lãm, Phường An Lạc',
    district: 'Bình Tân',
    latitude: 10.7258,
    longitude: 106.6115,
    riskLevel: 'LOW',
    riskScore: 22,
  },
  {
    id: 'fac-010',
    code: 'CS-Q3-002',
    name: 'Tòa nhà Viettel Complex',
    address: '285 Cách Mạng Tháng 8, Phường 12',
    district: 'Quận 3',
    latitude: 10.7761,
    longitude: 106.6775,
    riskLevel: 'LOW',
    riskScore: 35,
  },
];

export function GisMapPage() {
  const [district, setDistrict] = useState<string>('ALL');
  const [riskLevel, setRiskLevel] = useState<string>('ALL');

  const filteredCount = DEMO_FACILITIES.filter((f) => {
    const matchD = district === 'ALL' || f.district.toLowerCase().includes(district.toLowerCase());
    const matchR = riskLevel === 'ALL' || f.riskLevel === riskLevel;
    return matchD && matchR;
  }).length;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] p-4 space-y-4 max-w-7xl mx-auto">
      {/* Header & Status bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xl">
            <Flame className="w-6 h-6 animate-pulse" />
            <span>Bản đồ số Quản trị An toàn PCCC TP. Hồ Chí Minh (FR-09)</span>
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-slate-400" />
            Giám sát thời gian thực vị trí cơ sở, phân loại mức nguy hiểm cháy nổ theo Nghị định 105 & 106/2025/NĐ-CP
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-semibold bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block shadow-sm"></span>
            Cao (&ge; 70đ)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm"></span>
            TB (40-69đ)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block shadow-sm"></span>
            Thấp (&lt;40đ)
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Bộ lọc GIS:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-medium">Địa bàn:</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Toàn TP.HCM (Tất cả)</option>
              <option value="Quận 1">Quận 1</option>
              <option value="Quận 3">Quận 3</option>
              <option value="Quận 7">Quận 7</option>
              <option value="TP. Thủ Đức">TP. Thủ Đức</option>
              <option value="Bình Tân">Bình Tân</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-500 text-xs font-medium">Mức nguy cơ:</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              className="border border-slate-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="HIGH">Nguy cơ Cao (Đỏ)</option>
              <option value="MEDIUM">Nguy cơ Trung bình (Vàng)</option>
              <option value="LOW">Nguy cơ Thấp (Xanh)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium">
          Hiển thị: <span className="text-blue-600 font-bold">{filteredCount}</span> / {DEMO_FACILITIES.length} cơ sở trọng điểm
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 min-h-[500px] bg-slate-100 rounded-xl overflow-hidden relative shadow-sm">
        <GisMapContainer
          facilities={DEMO_FACILITIES}
          selectedDistrict={district}
          selectedRiskLevel={riskLevel}
        />
      </div>
    </div>
  );
}
