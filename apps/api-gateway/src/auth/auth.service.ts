import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../gateway/database/database.service';
import { UsersRepository, RefreshTokensRepository } from '@repo/database';
import { MailService } from '../mail/mail.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly usersRepo: UsersRepository;
  private readonly refreshTokensRepo: RefreshTokensRepository;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.usersRepo = new UsersRepository(this.databaseService.db);
    this.refreshTokensRepo = new RefreshTokensRepository(this.databaseService.db);
  }

  async signUp(dto: SignUpDto): Promise<AuthTokens> {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const activationLink = uuidv4();

    const user = await this.usersRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      activationLink,
    });

    await this.mailService.sendActivationMail(user.email!, activationLink);

    return this.generateTokens(user.id, user.email!);
  }

  async signIn(dto: SignInDto): Promise<AuthTokens> {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash ?? '');
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActivated) throw new UnauthorizedException('Account is not activated');

    return this.generateTokens(user.id, user.email!);
  }

  async signOut(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hmacToken(rawRefreshToken);
    const stored = await this.refreshTokensRepo.findByTokenHash(tokenHash);
    if (stored) {
      await this.refreshTokensRepo.deleteById(stored.id);
    }
  }

  async rotateTokens(userId: string, email: string, rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hmacToken(rawRefreshToken);
    const stored = await this.refreshTokensRepo.findByTokenHash(tokenHash);

    if (!stored || stored.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > stored.expiresAt) {
      await this.refreshTokensRepo.deleteById(stored.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.refreshTokensRepo.deleteById(stored.id);
    return this.generateTokens(userId, email);
  }

  async activate(link: string): Promise<void> {
    const user = await this.usersRepo.findByActivationLink(link);
    if (!user) throw new BadRequestException('Invalid activation link');
    await this.usersRepo.activate(user.id);
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const tokenHash = this.hmacToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokensRepo.create(userId, tokenHash, expiresAt);

    return { accessToken, refreshToken };
  }

  private hmacToken(token: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    return createHmac('sha256', secret).update(token).digest('hex');
  }
}
