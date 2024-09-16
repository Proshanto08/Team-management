import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  Delete,
  Query,
} from '@nestjs/common';
import { JiraService } from './jira.service';
import { IUser } from 'src/users/schemas/user.schema';

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
  users?: IUser;
}

interface IGetAllUsersResponse {
  message: string;
  statusCode: number;
  users: IJiraUserData[];
}

interface IJiraIssueData {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
  };
}

interface IGetUserIssuesResponse {
  message: string;
  statusCode: number;
  issues: IJiraIssueData[];
}

@Controller()
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get()
  getServerTime() {
    const serverTime = new Date().toISOString();
    return { serverTime };
  }

  @Get('user/:accountId/issues')
  async getUserIssues(@Param('accountId') accountId: string): Promise<IGetUserIssuesResponse>  {
    return this.jiraService.getUserIssues(accountId);
  }

  @Post('jira/users/create')
  async fetchAndSaveUser(
    @Body() body: { accountId: string },
  ): Promise<IUserResponse> {
    const { accountId } = body;
    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    return await this.jiraService.fetchAndSaveUser(accountId);
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page: string = '1', 
    @Query('limit') limit: string = '10'
  ): Promise<IGetAllUsersResponse> {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
  
    return this.jiraService.getAllUsers(pageNumber, limitNumber);
  }
  

  @Get('jira/users/:accountId')
  async getUserDetails(
    @Param('accountId') accountId: string,
  ): Promise<IJiraUserData> {
    const userDetails = await this.jiraService.getUserDetails(accountId);
    return userDetails;
  }

  @Get('users/:accountId')
  async getUser(@Param('accountId') accountId: string): Promise<IUserResponse> {
    const userDetails = await this.jiraService.getUser(accountId);
    return userDetails;
  }

  @Delete('users/:accountId')
  async deleteUser(
    @Param('accountId') accountId: string,
  ): Promise<IUserResponse> {
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

  @Get('metrics')
  async getUserMetrics() {
    const result = await this.jiraService.getAllUserMetrics();
    return result;
  }
}
