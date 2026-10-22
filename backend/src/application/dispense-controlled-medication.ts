import { Inject, Injectable } from '@nestjs/common'
import { DispenseCommand } from '../domain/dispensation'
import { DISPENSATION_REPOSITORY, DispensationRepository } from './ports/dispensation.repository'

@Injectable()
export class DispenseControlledMedication {
  constructor(
    @Inject(DISPENSATION_REPOSITORY)
    private readonly repository: DispensationRepository,
  ) {}

  execute(command: DispenseCommand) {
    if (
      !command.sku.trim() ||
      !command.prescriptionFolio.trim() ||
      !command.prescriberId.trim() ||
      !command.userId.trim() ||
      !Number.isSafeInteger(command.quantity) ||
      command.quantity <= 0
    ) {
      throw new TypeError('SKU, quantity, prescription, prescriber and authenticated user are required')
    }
    return this.repository.dispense(command)
  }
}
