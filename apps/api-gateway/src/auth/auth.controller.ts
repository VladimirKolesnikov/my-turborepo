import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService, AuthTokens } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signUp(dto);
    this.setCookies(res, tokens);
    return { message: 'Signed up successfully. Please activate your account.' };
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signIn(dto);
    this.setCookies(res, tokens);
    return { message: 'Signed in successfully.' };
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.signOut(refreshToken);
    }
    this.clearCookies(res);
    return { message: 'Signed out successfully.' };
  }

  @Get('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @Req() req: Request & { user: { userId: string; email: string; refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, email, refreshToken } = req.user;
    const tokens = await this.authService.rotateTokens(userId, email, refreshToken);
    this.setCookies(res, tokens);
    return { message: 'Tokens refreshed successfully.' };
  }

  @Get('activate/:link')
  async activate(
    @Param('link') link: string,
    @Res() res: Response,
  ) {
    await this.authService.activate(link);
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Account Activated</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px">
          <h1>Account activated successfully</h1>
          <p>You can now sign in.</p>
        </body>
      </html>
    `);
  }

  private setCookies(res: Response, tokens: AuthTokens): void {
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  private clearCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
