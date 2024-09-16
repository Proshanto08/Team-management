import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import { JiraService } from './jira.service';
import { User } from 'src/users/schemas/user.schema';

interface IJiraUserData {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrls: string;
  currentPerformance?: number;
}

interface IUserResponse {
  message: string;
  statusCode: number;
  users?: User;
}

interface IGetAllUsersResponse {
  message: string;
  statusCode: number;
  users: IJiraUserData[];
}

@Controller()
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get()
  getServerTime() {
    const serverTime = new Date().toISOString();
    return { serverTime };
  }

  @Post('jira/users/create')
  async fetchAndSaveUser(@Body() body: { accountId: string }) {
    const { accountId } = body;
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    const result = await this.jiraService.fetchAndSaveUser(accountId);
    return result;
  }

  @Get('users')
  async getAllUsers(): Promise<IGetAllUsersResponse> {
    const users = await this.jiraService.getAllUsers();
    return users;
  }


  // @Get('jira/users/:accountId')
  // async getUserDetails(@Param('accountId') accountId: string) {
  //   const userDetails = await this.jiraService.getUserDetails(accountId);
  //   return userDetails;
  // }

  // @Get('users/:accountId')
  // async getUser(@Param('accountId') accountId: string): Promise<UserResponse> {
  //   const userDetails = await this.jiraService.getUser(accountId);
  //   return userDetails;
  // }

  @Delete('users/:accountId')
  async deleteUser(@Param('accountId') accountId: string): Promise<IUserResponse> {
    return await this.jiraService.deleteUser(accountId);
  }

  @Post('update-morning-history')
  async updateMorningIssueHistory() {
    await this.jiraService.updateMorningIssueHistory();
    return { message: 'Morning issue history updated successfully' };
  }

  @Post('update-evening-history')
  async updateEveningIssueHistory() {
    await this.jiraService.updateEveningIssueHistory();
    return { message: 'Evening issue history updated successfully' };
  }

  @Get('users/:accountId')
  async getUserMetrics(@Param('accountId') accountId: string) {
    return await this.jiraService.getUserMetrics(accountId);
  }
}
