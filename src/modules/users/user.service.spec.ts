import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Model } from 'mongoose';
import { Designation } from './schemas/user.schema';

const mockUser = {
  accountId: '1',
  displayName: 'John Doe',
  emailAddress: 'john@example.com',
  avatarUrls: 'http://example.com/avatar.png',
  currentPerformance: 0,
  designation: 'Frontend Developer',
  isArchive: false,
  issueHistory: [],
  toObject: jest.fn().mockReturnValue({
    accountId: '1',
    displayName: 'John Doe',
    emailAddress: 'john@example.com',
    avatarUrls: 'http://example.com/avatar.png',
    currentPerformance: 0,
    designation: 'Frontend Developer',
    isArchive: false,
    issueHistory: [],
  }),
};

const mockUserModel = {
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn().mockResolvedValue(mockUser),
  countDocuments: jest.fn(),
  find: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([mockUser]),
  }),
  exec: jest.fn(),
};

describe('UserService', () => {
  let userService: UserService;
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

//   describe('saveUser', () => {
//     it('should save a new user successfully', async () => {
//       mockUserModel.findOne.mockResolvedValue(null); // Simulate no existing user

//       const result = await userService.saveUser('1', {
//         accountId: '1',
//         displayName: 'John Doe',
//         emailAddress: 'john@example.com',
//         avatarUrls: mockUser.avatarUrls,
//         currentPerformance: 0,
//       }, Designation.FrontendDeveloper);

//       expect(result).toEqual({
//         message: 'User saved successfully',
//         statusCode: 201,
//         user: mockUser,
//       });
//       expect(mockUserModel.create).toHaveBeenCalledWith(expect.any(Object));
//     });

//     it('should throw BadRequestException for invalid designation', async () => {
//       await expect(userService.saveUser('1', mockUser, 'Invalid Designation' as Designation))
//         .rejects.toThrow(BadRequestException);
//     });

//     it('should return conflict if user already exists', async () => {
//       mockUserModel.findOne.mockResolvedValue(mockUser); // Simulate existing user

//       const result = await userService.saveUser('1', mockUser, Designation.FrontendDeveloper);

//       expect(result).toEqual({
//         message: 'User already exists',
//         statusCode: 409,
//       });
//     });
//   });

  describe('getAllUsers', () => {
    it('should return all users with pagination', async () => {
      mockUserModel.countDocuments.mockResolvedValue(2);
      mockUserModel.find.mockReturnValue(mockUserModel); // Allow method chaining
      mockUserModel.limit.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockUser]),
      });

      const result = await userService.getAllUsers(1, 10);

      expect(result).toEqual({
        message: 'Users found successfully',
        statusCode: 200,
        users: [mockUser],
        totalPages: 1,
        currentPage: 1,
        totalUsers: 2,
      });
    });
  });

  describe('getUser', () => {
    it('should return a user with issue history', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await userService.getUser('1', 1, 1);

      expect(result).toEqual({
        message: 'User found successfully',
        statusCode: 200,
        user: expect.objectContaining({
          accountId: '1',
          displayName: 'John Doe',
        }),
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(userService.getUser('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUserModel.findOneAndDelete.mockResolvedValue(mockUser);

      const result = await userService.deleteUser('1');

      expect(result).toEqual({
        message: 'User deleted successfully',
        statusCode: 200,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(userService.deleteUser('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('archiveUser', () => {
    // it('should archive a user successfully', async () => {
    //   mockUserModel.findOne.mockResolvedValue(mockUser);
    //   mockUser.isArchive = false; // Ensure user is not archived

    //   const result = await userService.archiveUser('1');

    //   expect(result).toEqual({
    //     message: 'User archived successfully',
    //     statusCode: 200,
    //   });
    // });

    it('should throw NotFoundException if user does not exist', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(userService.archiveUser('1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already archived', async () => {
      mockUser.isArchive = true;
      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(userService.archiveUser('1')).rejects.toThrow(ConflictException);
    });
  });
});
