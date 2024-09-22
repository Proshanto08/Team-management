import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { JiraService } from './jira.service';
import {
  IJiraUserData,
  IUserResponse,
} from '../../interfaces/jira.interfaces'; // Removed IGetUserIssuesResponse
import { Designation } from '../users/schemas/user.schema';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get(':accountId')
  async getUserDetails(
    @Param('accountId') accountId: string,
  ): Promise<IJiraUserData> {
    return await this.jiraService.getUserDetails(accountId);
  }

  @Post('users/create')
  async fetchAndSaveUser(
    @Body() body: { accountId: string; designation: Designation },
  ): Promise<IUserResponse> {
    const { accountId, designation } = body;

    if (!accountId) {
      throw new BadRequestException('accountId is required');
    }
    if (!designation) {
      throw new BadRequestException('designation is required');
    }
    return await this.jiraService.fetchAndSaveUser(accountId, designation);
  }

  @Put(':accountId/issues/not-done-month')
  async countNotDoneIssues(
    @Param('accountId') accountId: string,
  ): Promise<void> {
    await this.jiraService.countNotDoneIssues(accountId);
  }

  @Put(':accountId/issues/done-month')
  async countDoneIssues(@Param('accountId') accountId: string): Promise<void> {
    await this.jiraService.countDoneIssues(accountId);
  }

  @Put(':accountId/issues/not-done-today')
  async countNotDoneIssuesForToday(
    @Param('accountId') accountId: string,
  ): Promise<void> {
    await this.jiraService.countNotDoneIssuesForToday(accountId);
  }

  @Put(':accountId/issues/done-today')
  async countDoneIssuesForToday(
    @Param('accountId') accountId: string,
  ): Promise<void> {
    await this.jiraService.countDoneIssuesForToday(accountId);
  }

  @Put('update-morning-issue-history')
  async updateMorningIssueHistory(): Promise<void> {
    await this.jiraService.updateMorningIssueHistory();
  }

  @Put('update-evening-issue-history')
  async updateEveningIssueHistory(): Promise<void> {
    await this.jiraService.updateEveningIssueHistory();
  }

  @Put('update-morning-issue-history-30days')
  async updateMorningIssueHistoryFor30days(): Promise<void> {
    await this.jiraService.updateMorningIssueHistoryFor30days();
  }

  @Put('update-evening-issue-history-30days')
  async updateEveningIssueHistoryFor30days(): Promise<void> {
    await this.jiraService.updateEveningIssueHistoryFor30days();
  }

  @Put('metrics')
  async getUserMetrics(): Promise<void> { // Added return type
    await this.jiraService.getAllUserMetrics(); // Removed return statement
  }
}
