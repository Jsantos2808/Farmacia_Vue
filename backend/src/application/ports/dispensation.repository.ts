import { DispenseCommand, Dispensation } from '../../domain/dispensation'

export interface DispensationRepository {
  dispense(command: DispenseCommand): Promise<Dispensation>
}

export const DISPENSATION_REPOSITORY = Symbol('DISPENSATION_REPOSITORY')
