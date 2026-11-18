import { afterEach, describe, expect, it, vi } from 'vitest';
import { localRepository } from './repository';
import { createSeed } from './seed';

afterEach(() => vi.unstubAllGlobals());
describe('Локальное сохранение', () => {
  it('повреждённая запись не заменяется молча новым набором', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => '{broken', setItem });
    await expect(localRepository.load()).rejects.toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });
  it('переполнение хранилища возвращает явную ошибку', async () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    });
    await expect(localRepository.save(createSeed())).rejects.toThrow('Не удалось сохранить');
  });
});
