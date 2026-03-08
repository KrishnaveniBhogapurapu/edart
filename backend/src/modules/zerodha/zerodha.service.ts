import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model, Types } from 'mongoose';
import { decryptText, encryptText } from '../../common/utils/crypto.util.js';
import {
  ZerodhaSession,
  ZerodhaSessionDocument,
} from '../../database/schemas/zerodha-session.schema.js';
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { SaveZerodhaSessionDto } from './dto/save-zerodha-session.dto.js';

export interface InstrumentRow {
  instrument_token: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: string;
  expiry: string;
  strike: string;
  tick_size: string;
  lot_size: string;
  instrument_type: string;
  segment: string;
  exchange: string;
}

@Injectable()
export class ZerodhaService {
  private instrumentCache: { expiresAt: number; data: InstrumentRow[] } = {
    expiresAt: 0,
    data: [],
  };

  constructor(
    @InjectModel(ZerodhaSession.name)
    private readonly zerodhaSessionModel: Model<ZerodhaSessionDocument>,
  ) {}

  async saveSession(userId: string, payload: SaveZerodhaSessionDto) {
    const encrypted = encryptText(payload.enctoken);

    await this.zerodhaSessionModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          encryptedEncToken: encrypted.encrypted,
          iv: encrypted.iv,
          authTag: encrypted.tag,
          zerodhaUserId: payload.user_id,
        },
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
        },
      },
      { upsert: true },
    );

    return { connected: true, user_id: payload.user_id };
  }

  async getSessionStatus(userId: string) {
    const session = await this.zerodhaSessionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!session) {
      return { connected: false };
    }

    return {
      connected: true,
      user_id: session.zerodhaUserId,
    };
  }

  async fetchInstruments(query?: string) {
    const now = Date.now();

    if (this.instrumentCache.expiresAt < now) {
      const response = await axios.get<string>('https://api.kite.trade/instruments', {
        headers: {
          'x-kite-version': '3',
        },
        responseType: 'text',
      });

      this.instrumentCache = {
        data: this.parseCsv(response.data),
        expiresAt: now + 5 * 60 * 1000,
      };
    }

    const q = (query ?? '').toLowerCase().trim();

    const filtered = !q
      ? this.instrumentCache.data
      : this.instrumentCache.data.filter((row) => {
          const haystack = [
            row.tradingsymbol,
            row.name,
            row.exchange,
            row.segment,
            row.instrument_token,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });

    return filtered.slice(0, 300);
  }

  async fetchHistorical(userId: string, query: HistoryQueryDto) {
    const session = await this.getDecryptedSession(userId);
    const intervalMinutes = query.interval.replace('m', '');

    const url = `https://kite.zerodha.com/oms/instruments/historical/${query.instrumentToken}/${intervalMinutes}minute`;

    const response = await axios.get(url, {
      params: {
        user_id: query.user_id ?? session.userId,
        oi: 1,
        from: query.from,
        to: query.to,
      },
      headers: {
        'x-kite-version': '3',
        Authorization: `enctoken ${session.enctoken}`,
      },
    });

    const candles = response.data?.data?.candles;
    if (!Array.isArray(candles)) {
      throw new NotFoundException('No candle data returned from Zerodha.');
    }

    return {
      candles,
    };
  }

  async getDecryptedSession(userId: string): Promise<{ enctoken: string; userId: string }> {
    const session = await this.zerodhaSessionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();

    if (!session) {
      throw new UnauthorizedException('Zerodha session not configured.');
    }

    return {
      enctoken: decryptText(session.encryptedEncToken, session.iv, session.authTag),
      userId: session.zerodhaUserId,
    };
  }

  private parseCsv(raw: string): InstrumentRow[] {
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) {
      return [];
    }

    const header = this.splitCsvLine(lines[0]);

    return lines.slice(1).map((line) => {
      const values = this.splitCsvLine(line);
      const record = Object.fromEntries(
        header.map((key, index) => [key, values[index] ?? '']),
      ) as Record<string, string>;

      return {
        instrument_token: record.instrument_token ?? '',
        exchange_token: record.exchange_token ?? '',
        tradingsymbol: record.tradingsymbol ?? '',
        name: record.name ?? '',
        last_price: record.last_price ?? '',
        expiry: record.expiry ?? '',
        strike: record.strike ?? '',
        tick_size: record.tick_size ?? '',
        lot_size: record.lot_size ?? '',
        instrument_type: record.instrument_type ?? '',
        segment: record.segment ?? '',
        exchange: record.exchange ?? '',
      };
    });
  }

  private splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((value) => value.replace(/^"|"$/g, ''));
  }
}
