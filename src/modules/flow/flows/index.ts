import { FlowConfig } from '../interfaces/flow-config.interface';
import { TenantSlug } from '../tenant-slug.enum';
import { aguilarCosmetiquerasFlowConfig } from './aguilar-cosmetiqueras.flow';
import { defaultFlowConfig } from './default.flow';
import { hmImpulsoDigitalFlowConfig } from './hm-impulso-digital.flow';
import { otroTenanFlowConfig } from './otro-tenan.flow';

export const flowConfigsByTenantSlug: Partial<Record<TenantSlug, FlowConfig>> =
  {
    [TenantSlug.AGUILAR_COSMETIQUERAS]: aguilarCosmetiquerasFlowConfig,
    [TenantSlug.HM_IMPULSO_DIGITAL]: hmImpulsoDigitalFlowConfig,
    [TenantSlug.OTRO_TENAN]: otroTenanFlowConfig,
  };

export { defaultFlowConfig };
