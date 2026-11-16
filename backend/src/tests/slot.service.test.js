import { computeSlots } from '../services/slot.service.js';

// 2026-11-23 est un lundi (jourSemaine = 1). Tunis = UTC+1.
const schedules = [{ jourSemaine: 1, heureDebut: '09:00', heureFin: '11:00', dureeConsultation: 30 }];
const now = new Date('2026-11-01T00:00:00Z');
const base = { schedules, fromDate: '2026-11-23', toDate: '2026-11-23', now };

describe('computeSlots', () => {
  it('génère 4 créneaux de 30 min pour 09:00-11:00 (en UTC)', () => {
    const slots = computeSlots(base);
    expect(slots).toHaveLength(4);
    expect(slots[0].debut.toISOString()).toBe('2026-11-23T08:00:00.000Z'); // 09:00 Tunis
  });

  it('retire les créneaux qui chevauchent une absence', () => {
    const absences = [{ debut: new Date('2026-11-23T08:30:00Z'), fin: new Date('2026-11-23T09:30:00Z') }];
    expect(computeSlots({ ...base, absences })).toHaveLength(2);
  });

  it('retire les créneaux déjà réservés', () => {
    const appointments = [{ debut: new Date('2026-11-23T08:00:00Z'), fin: new Date('2026-11-23T08:30:00Z') }];
    const slots = computeSlots({ ...base, appointments });
    expect(slots).toHaveLength(3);
    expect(slots[0].debut.toISOString()).toBe('2026-11-23T08:30:00.000Z');
  });

  it("renvoie 0 créneau un jour sans agenda (mardi)", () => {
    expect(computeSlots({ ...base, fromDate: '2026-11-24', toDate: '2026-11-24' })).toHaveLength(0);
  });

  it('ignore les créneaux passés', () => {
    const slots = computeSlots({ ...base, now: new Date('2026-11-23T08:20:00Z') });
    expect(slots).toHaveLength(3);
  });

  it('gère plusieurs jours', () => {
    const slots = computeSlots({ ...base, toDate: '2026-11-30' }); // 2 lundis
    expect(slots).toHaveLength(8);
  });
});