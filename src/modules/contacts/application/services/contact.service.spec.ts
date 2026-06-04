import { ContactService } from './contact.service';

describe('ContactService', () => {
  const contactRepository = {
    findByPhone: jest.fn(),
    findByWalletAddress: jest.fn(),
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findFavoritesByUserId: jest.fn(),
    findRecentsByUserId: jest.fn(),
    searchByName: jest.fn(),
    delete: jest.fn(),
  };
  const userRepository = {
    findAll: jest.fn(),
    findByPhoneHashes: jest.fn(),
  };
  const eventEmitter = {
    emit: jest.fn(),
  };

  let service: ContactService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContactService(
      contactRepository as any,
      userRepository as any,
      eventEmitter as any,
    );
  });

  it('syncs contact hashes through indexed phone-hash lookup', async () => {
    const phone = '+2250700000000';
    const phoneHash =
      '7b8ba33632434095d271ce453f12c054320979f4631b78414fa747d4984b88e2';
    userRepository.findByPhoneHashes.mockResolvedValue([
      { id: 'user-1', phone, avatarUrl: 'https://cdn.test/avatar.png' },
    ]);

    const result = await service.syncContacts([phoneHash, phoneHash]);

    expect(userRepository.findByPhoneHashes).toHaveBeenCalledWith([phoneHash]);
    expect(userRepository.findAll).not.toHaveBeenCalled();
    expect(result).toEqual({
      matches: [
        {
          phoneHash,
          userId: 'user-1',
          avatarUrl: 'https://cdn.test/avatar.png',
        },
      ],
      totalChecked: 2,
      matchesFound: 1,
    });
  });
});
