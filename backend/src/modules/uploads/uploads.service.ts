import { BadRequestException, Injectable } from '@nestjs/common';
import { VariableConfig } from '@candle/engine';
import * as XLSX from 'xlsx';
import { ExcelCandleProvider } from '../../providers/excel/excel.provider.js';
import { EngineRunnerService } from '../../runtime/engine/engine-runner.service.js';

@Injectable()
export class UploadsService {
  constructor(
    private readonly excelCandleProvider: ExcelCandleProvider,
    private readonly engineRunnerService: EngineRunnerService,
  ) {}

  processExcelFile(file: Express.Multer.File, variablesRaw?: string) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException('Excel file does not contain any sheets.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });

    const candles = this.excelCandleProvider.normalizeRows(rows);

    if (!candles.length) {
      throw new BadRequestException(
        'No valid candle rows found. Required columns: time/open/high/low/close',
      );
    }

    let variables: VariableConfig[] = [];
    if (variablesRaw) {
      try {
        variables = JSON.parse(variablesRaw) as VariableConfig[];
      } catch {
        throw new BadRequestException('Invalid variables JSON payload.');
      }
    }

    const result = this.engineRunnerService.run(candles, variables);

    return {
      fileSummary: {
        name: file.originalname,
        sheet: firstSheetName,
        totalRows: rows.length,
        normalizedRows: candles.length,
      },
      result,
    };
  }
}
