import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as dotenv from 'dotenv';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Cron } from '@nestjs/schedule';

dotenv.config();

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

@Injectable()
export class JiraService {
  private readonly jiraBaseUrl = process.env.JIRA_BASE_URL;
  private readonly headers = {
    Authorization: `Basic ${Buffer.from(
      `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`,
    ).toString('base64')}`,
    Accept: 'application/json',
  };

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getUserDetails(accountId: string): Promise<IJiraUserData> {
    const apiUrl = `${this.jiraBaseUrl}/rest/api/3/user?accountId=${accountId}`;

    try {
      const response = await this.httpService
        .get<IJiraUserData>(apiUrl, { headers: this.headers })
        .toPromise();
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new NotFoundException(`User not found`);
      } else if (error.response && error.response.status === 400) {
        throw new BadRequestException(`Invalid accountId`);
      } else {
        throw new InternalServerErrorException(
          'Error fetching user details from Jira',
        );
      }
    }
  }

  async saveUser(
    accountId: string,
    userData: IJiraUserData,
  ): Promise<{ message: string; statusCode: number; user?: User }> {
    try {
      const avatar48x48 = userData.avatarUrls['48x48'];

      const userToSave = {
        accountId: userData.accountId,
        displayName: userData.displayName,
        emailAddress: userData.emailAddress,
        avatarUrls: avatar48x48,
        currentPerformance: userData.currentPerformance || 0,
      };

      const existingUser = await this.userModel.findOne({ accountId });
      if (existingUser) {
        return {
          message: 'User already exists',
          statusCode: 409,
        };
      } else {
        const newUser = new this.userModel(userToSave);
        await newUser.save();
        return {
          message: 'User saved successfully',
          statusCode: 201,
          user: newUser,
        };
      }
    } catch (error) {
      console.error('Error during user save:', error.message || error);
      throw new InternalServerErrorException('Error saving user');
    }
  }

  async fetchAndSaveUser(accountId: string): Promise<IUserResponse> {
    try {
      const userDetails = await this.getUserDetails(accountId);
      return await this.saveUser(accountId, userDetails);
    } catch (error) {
      throw new InternalServerErrorException('Error fetching and saving user');
    }
  }

  async getAllUsers(): Promise<IGetAllUsersResponse> {
    try {
      const users = await this.userModel
        .find(
          {},
          'accountId displayName emailAddress avatarUrls currentPerformance',
        )
        .exec();

      return { message: 'Users found successfully', statusCode: 200, users };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching users from database',
      );
    }
  }

  async getUser(accountId: string): Promise<IUserResponse> {
    try {
      const users = await this.userModel.findOne({ accountId }).exec();

      if (!users) {
        throw new NotFoundException(`User not found`);
      }
      return { message: 'User found successfully', statusCode: 200, users };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching user from database',
      );
    }
  }

  async deleteUser(accountId: string): Promise<IUserResponse> {
    try {
      const deletedUser = await this.userModel.findOneAndDelete({ accountId });

      if (!deletedUser) {
        throw new NotFoundException(
          `User with accountId ${accountId} not found`,
        );
      }

      return {
        message: 'User deleted successfully',
        statusCode: 200,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error deleting user');
    }
  }

  async countNotDoneIssues(accountId: string) {
    const notDoneApiUrl = `${this.jiraBaseUrl}/rest/api/3/search?jql=assignee=${accountId} AND status!=Done`;

    try {
      const response = await this.httpService
        .get(notDoneApiUrl, { headers: this.headers })
        .toPromise();
      const notDoneIssues = response.data.issues;

      const countsByDate = {};
      notDoneIssues.forEach((issue) => {
        const creationDate = issue.fields.created.split('T')[0];
        const issueType = issue.fields.issuetype.name;

        if (!countsByDate[creationDate]) {
          countsByDate[creationDate] = {
            Task: 0,
            Bug: 0,
            Story: 0,
          };
        }

        if (issueType === 'Task') {
          countsByDate[creationDate].Task++;
        } else if (issueType === 'Bug') {
          countsByDate[creationDate].Bug++;
        } else if (issueType === 'Story') {
          countsByDate[creationDate].Story++;
        }
      });

      for (const [date, counts] of Object.entries(countsByDate)) {
        await this.saveNotDoneIssueCounts(accountId, date, counts);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching not-done issues from Jira',
      );
    }
  }

  async countDoneIssues(accountId: string) {
    const doneApiUrl = `${this.jiraBaseUrl}/rest/api/3/search?jql=assignee=${accountId} AND status=Done`;

    try {
      const response = await this.httpService
        .get(doneApiUrl, { headers: this.headers })
        .toPromise();
      const doneIssues = response.data.issues;
      const countsByDate = {};
      doneIssues.forEach((issue) => {
        const creationDate = issue.fields.created.split('T')[0];
        const issueType = issue.fields.issuetype.name;

        if (!countsByDate[creationDate]) {
          countsByDate[creationDate] = {
            Task: 0,
            Bug: 0,
            Story: 0,
          };
        }

        if (issueType === 'Task') {
          countsByDate[creationDate].Task++;
        } else if (issueType === 'Bug') {
          countsByDate[creationDate].Bug++;
        } else if (issueType === 'Story') {
          countsByDate[creationDate].Story++;
        }
      });

      for (const [date, counts] of Object.entries(countsByDate)) {
        await this.saveDoneIssueCounts(accountId, date, counts);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching done issues from Jira',
      );
    }
  }

  async saveNotDoneIssueCounts(accountId: string, date: string, counts: any) {
    try {
      const user = await this.userModel.findOne({ accountId });

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      const existingHistory = user.issueHistory.find(
        (history) => history.date === date,
      );

      if (existingHistory) {
        existingHistory.issuesCount.notDone = counts;
      } else {
        user.issueHistory.push({
          date,
          issuesCount: {
            notDone: counts,
          },
        });
      }

      await user.save();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error saving not-done issue counts',
      );
    }
  }

  async saveDoneIssueCounts(accountId: string, date: string, counts: any) {
    try {
      const user = await this.userModel.findOne({ accountId });

      if (!user) {
        throw new InternalServerErrorException('User not found');
      }

      const existingHistory = user.issueHistory.find(
        (history) => history.date === date,
      );

      if (existingHistory) {
        existingHistory.issuesCount.done = counts;
      } else {
        user.issueHistory.push({
          date,
          issuesCount: {
            done: counts,
          },
        });
      }

      await user.save();
    } catch (error) {
      throw new InternalServerErrorException('Error saving done issue counts');
    }
  }

  @Cron('42 08 * * *')
  async updateMorningIssueHistory() {
    console.log('Running updateMorningIssueHistory');
    try {
      const users = await this.userModel.find().exec();
      for (const user of users) {
        await this.countNotDoneIssues(user.accountId);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error updating issue history for all users in the morning',
      );
    }
  }

  @Cron('53 08 * * *')
  async updateEveningIssueHistory() {
    console.log('Running updateEveningIssueHistory');
    try {
      const users = await this.userModel.find().exec();
      for (const user of users) {
        await this.countDoneIssues(user.accountId);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error updating issue history for all users in the evening',
      );
    }
  }

  @Cron('55 08 * * *')
  async getAllUserMetrics() {
    console.log('Running metrics');
    try {
      // Fetch all users
      const users = await this.userModel.find({}).exec();

      // Process each user to calculate metrics
      const updatedUsers = await Promise.all(
        users.map(async (user) => {
          const issueHistory = user.issueHistory;

          // Aggregate counts by date and calculate metrics
          const metricsByDay = await Promise.all(
            issueHistory.map(async (entry) => {
              const { date, issuesCount } = entry;
              const counts = issuesCount;

              let taskCompletionRate = 0;
              let userStoryCompletionRate = 0;
              let overallScore = 0;

              const totalNotDoneTasksAndBugs =
                counts.notDone.Task + counts.notDone.Bug;
              const totalDoneTasksAndBugs = counts.done.Task + counts.done.Bug;

              // Calculate task completion rate only if there are tasks or bugs
              if (totalNotDoneTasksAndBugs > 0) {
                taskCompletionRate =
                  (totalDoneTasksAndBugs / totalNotDoneTasksAndBugs) * 100;
              }

              // Calculate user story completion rate only if there are user stories
              if (counts.notDone.Story > 0) {
                userStoryCompletionRate =
                  (counts.done.Story / counts.notDone.Story) * 100;
              }

              // Calculate overall score based on available metrics
              const nonZeroCompletionRates = [];
              if (totalNotDoneTasksAndBugs > 0) {
                nonZeroCompletionRates.push(taskCompletionRate);
              }
              if (counts.notDone.Story > 0) {
                nonZeroCompletionRates.push(userStoryCompletionRate);
              }

              // If there are non-zero completion rates, calculate the average
              if (nonZeroCompletionRates.length > 0) {
                overallScore =
                  nonZeroCompletionRates.reduce((sum, rate) => sum + rate, 0) /
                  nonZeroCompletionRates.length;
              }

              // Ensure rates are valid numbers
              const taskCompletionRateNum = isNaN(taskCompletionRate)
                ? 0
                : taskCompletionRate;
              const userStoryCompletionRateNum = isNaN(userStoryCompletionRate)
                ? 0
                : userStoryCompletionRate;
              const overallScoreNum = isNaN(overallScore) ? 0 : overallScore;

              // Update entry with the calculated metrics
              entry.taskCompletionRate = taskCompletionRateNum;
              entry.userStoryCompletionRate = userStoryCompletionRateNum;
              entry.overallScore = overallScoreNum;

              return {
                date,
                numberOfTasks: counts.notDone.Task,
                numberOfBugs: counts.notDone.Bug,
                numberOfUserStories: counts.notDone.Story,
                completedTasks: totalDoneTasksAndBugs,
                completedUserStories: counts.done.Story,
                taskCompletionRate: taskCompletionRateNum,
                userStoryCompletionRate: userStoryCompletionRateNum,
                overallScore: overallScoreNum,
              };
            }),
          );

          // Calculate current performance by averaging overall scores
          const totalScore = metricsByDay.reduce(
            (sum, day) => sum + day.overallScore,
            0,
          );
          const currentPerformance = metricsByDay.length
            ? totalScore / metricsByDay.length
            : 0;

          user.currentPerformance = currentPerformance;
          user.issueHistory = issueHistory;
          await user.save();

          return user;
        }),
      );

      return {
        message: 'User metrics calculated successfully',
        users: updatedUsers,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error getting user metrics: ${error.message}`,
      );
    }
  }
}
