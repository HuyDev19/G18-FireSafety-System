import {
  buildAreaFilter,
  isAreaAllowed,
  normalizeNfc,
  parseAreaCodes,
} from './area.util';

describe('Area Utility (FR-01 Scope & NFC Normalization)', () => {
  describe('normalizeNfc', () => {
    it('should normalize decomposed unicode to NFC and trim whitespace', () => {
      // "Quận 1" with combining characters vs composed
      const decomposed = 'Q\u0075\u1EAD\u006E 1 '; // u + ậ + n
      const normalized = normalizeNfc(decomposed);
      expect(normalized).toBe('Quận 1');
      expect(normalized.length).toBe('Quận 1'.length);
    });

    it('should handle empty or null string gracefully', () => {
      expect(normalizeNfc('')).toBe('');
      expect(normalizeNfc(null as any)).toBe('');
    });
  });

  describe('parseAreaCodes', () => {
    it('should parse comma-separated string into clean unique array', () => {
      const input = 'Quận 1,  Quận 3 , Quận 10, Quận 1';
      const result = parseAreaCodes(input);
      expect(result).toEqual(['Quận 1', 'Quận 3', 'Quận 10']);
    });

    it('should return empty array for null/undefined/empty input', () => {
      expect(parseAreaCodes(null)).toEqual([]);
      expect(parseAreaCodes(undefined)).toEqual([]);
      expect(parseAreaCodes('')).toEqual([]);
    });
  });

  describe('isAreaAllowed (IDOR & Substring Prevention)', () => {
    it('should allow ADMIN and LEADER regardless of target district', () => {
      expect(isAreaAllowed('Quận 1', 'Quận 7', 'ADMIN')).toBe(true);
      expect(isAreaAllowed('Quận 1', 'Quận 7', 'LEADER')).toBe(true);
    });

    it('should allow if user areaCode is ALL', () => {
      expect(isAreaAllowed('ALL', 'Bình Thạnh', 'INSPECTOR')).toBe(true);
    });

    it('CRITICAL: should NOT match substring (Quận 1 must NOT match Quận 10 or Quận 11)', () => {
      const inspectorArea = 'Quận 1, Quận 3';
      // Exactly "Quận 1" is allowed
      expect(isAreaAllowed(inspectorArea, 'Quận 1', 'INSPECTOR')).toBe(true);
      // "Quận 10" contains "Quận 1" as substring, but must be REJECTED!
      expect(isAreaAllowed(inspectorArea, 'Quận 10', 'INSPECTOR')).toBe(false);
      // "Quận 11" contains "Quận 1" as substring, but must be REJECTED!
      expect(isAreaAllowed(inspectorArea, 'Quận 11', 'INSPECTOR')).toBe(false);
      // Other unassigned districts must be rejected
      expect(isAreaAllowed(inspectorArea, 'Quận 5', 'INSPECTOR')).toBe(false);
    });

    it('should match with decomposed unicode in target district', () => {
      const inspectorArea = 'Quận 1';
      const targetDecomposed = 'Q\u0075\u1EAD\u006E 1';
      expect(isAreaAllowed(inspectorArea, targetDecomposed, 'INSPECTOR')).toBe(true);
    });
  });

  describe('buildAreaFilter', () => {
    it('should return empty filter for ADMIN or LEADER', () => {
      expect(buildAreaFilter({ role: 'ADMIN', areaCode: 'Quận 1' })).toEqual({});
      expect(buildAreaFilter({ role: 'LEADER', areaCode: 'Quận 1' })).toEqual({});
    });

    it('should return empty filter for ALL areaCode', () => {
      expect(buildAreaFilter({ role: 'INSPECTOR', areaCode: 'ALL' })).toEqual({});
    });

    it('should return exact { district: { in: [...] } } filter for scoped inspector', () => {
      const filter = buildAreaFilter({
        role: 'INSPECTOR',
        areaCode: 'Quận 1, Quận 3',
      });
      expect(filter).toEqual({
        district: {
          in: ['Quận 1', 'Quận 3'],
        },
      });
    });
  });
});

