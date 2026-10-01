import { Injectable } from '@nestjs/common';

import { IntentDefinition } from './interfaces/flow-config.interface';

@Injectable()
export class IntentDetectorService {
  detect(
    message: string,
    intentDefinitions: IntentDefinition[] = [],
  ): string | null {
    const normalizedMessage = this.normalizeText(message);

    const matchedIntent = intentDefinitions.find((definition) =>
      definition.keywords.some((keyword) =>
        normalizedMessage.includes(this.normalizeText(keyword)),
      ),
    );

    return matchedIntent?.intent ?? null;
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
