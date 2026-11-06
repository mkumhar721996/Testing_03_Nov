import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import type { Job, Technician, TechnicianProfile, TechnicianSummary, WorkingDay } from './technician.model';
import { DuplicateEmailError, TECHNICIAN_REPOSITORY, type TechnicianRepository } from './technician.repository';
import {
  isCalendarDate,
  isUuid,
  jobsToReassign,
  validateNewTechnician,
  validateWeeklyHours,
} from './technician.validation';

export interface ReassignmentNeeded {
  technician: Technician;
  jobsNeedingReassignment: Job[];
}

/** Every route is admin-only; deactivating or marking a day off reports jobs but never changes them. */
@Controller()
@UseGuards(AdminGuard)
export class TechniciansController {
  constructor(@Inject(TECHNICIAN_REPOSITORY) private readonly repo: TechnicianRepository) {}

  @Post('technicians')
  async create(@Body() body: unknown): Promise<Technician> {
    const parsed = validateNewTechnician(body);
    if (!parsed.ok) {
      throw new BadRequestException({ message: 'Name and login email are required', errors: parsed.errors });
    }
    try {
      return await this.repo.create(parsed.value);
    } catch (e) {
      if (e instanceof DuplicateEmailError) {
        throw new ConflictException('A technician with this login email already exists');
      }
      throw e;
    }
  }

  @Get('technicians')
  list(@Query('status') status?: string): Promise<TechnicianSummary[]> {
    return this.repo.list(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : undefined);
  }

  // Declared before `technicians/:id` so "assignable" is not read as an id.
  @Get('technicians/assignable')
  assignable(): Promise<Technician[]> {
    return this.repo.listAssignable();
  }

  @Get('technicians/:id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TechnicianProfile> {
    const t = await this.repo.get(id);
    if (!t) throw new NotFoundException('Technician not found');
    return t;
  }

  @Get('technicians/:id/jobs')
  async openJobs(@Param('id', ParseUUIDPipe) id: string): Promise<Job[]> {
    return jobsToReassign(await this.repo.jobsHeldBy(id));
  }

  @Patch('technicians/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>): Promise<Technician> {
    const patch: Record<string, string | null> = {};
    for (const key of ['name', 'loginEmail', 'phone', 'serviceArea', 'notes']) {
      const v = body?.[key];
      if (typeof v === 'string') patch[key] = v.trim();
    }
    const errors: Record<string, string> = {};
    if (patch.name === '') errors.name = 'Enter the technician’s full name';
    if (patch.loginEmail === '') errors.loginEmail = 'Enter the technician’s login email';
    if (Object.keys(errors).length) throw new BadRequestException({ message: 'Name and login email are required', errors });
    for (const key of ['phone', 'serviceArea', 'notes']) if (patch[key] === '') patch[key] = null;
    try {
      const t = await this.repo.updateProfile(id, patch);
      if (!t) throw new NotFoundException('Technician not found');
      return t;
    } catch (e) {
      if (e instanceof DuplicateEmailError) {
        throw new ConflictException('A technician with this login email already exists');
      }
      throw e;
    }
  }

  @Put('technicians/:id/hours')
  @HttpCode(204)
  async putHours(@Param('id', ParseUUIDPipe) id: string, @Body() body: { days?: WorkingDay[] }): Promise<void> {
    const days = Array.isArray(body?.days) ? body.days : [];
    const errors = validateWeeklyHours(days);
    if (Object.keys(errors).length) {
      throw new BadRequestException({ message: 'Some working hours cannot be saved', errors });
    }
    if (!(await this.repo.get(id))) throw new NotFoundException('Technician not found');
    await this.repo.replaceWeeklyHours(id, days);
  }

  @Post('technicians/:id/days-off')
  async addDayOff(@Param('id', ParseUUIDPipe) id: string, @Body() body: { date?: string }): Promise<ReassignmentNeeded> {
    const date = body?.date;
    if (!isCalendarDate(date)) throw new BadRequestException('Choose a date');
    const technician = await this.repo.get(id);
    if (!technician) throw new NotFoundException('Technician not found');
    await this.repo.addDayOff(id, date);
    return { technician, jobsNeedingReassignment: jobsToReassign(await this.repo.jobsHeldBy(id, date), date) };
  }

  @Delete('technicians/:id/days-off/:date')
  @HttpCode(204)
  async removeDayOff(@Param('id', ParseUUIDPipe) id: string, @Param('date') date: string): Promise<void> {
    if (!isCalendarDate(date)) throw new BadRequestException('Choose a date');
    await this.repo.removeDayOff(id, date);
  }

  @Post('technicians/:id/deactivate')
  @HttpCode(200)
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ReassignmentNeeded> {
    const technician = await this.repo.setActive(id, false);
    if (!technician) throw new NotFoundException('Technician not found');
    return { technician, jobsNeedingReassignment: jobsToReassign(await this.repo.jobsHeldBy(id)) };
  }

  @Post('technicians/:id/activate')
  @HttpCode(200)
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<Technician> {
    const t = await this.repo.setActive(id, true);
    if (!t) throw new NotFoundException('Technician not found');
    return t;
  }

  @Post('jobs/:jobId/reassign')
  @HttpCode(200)
  async reassign(@Param('jobId') jobId: string, @Body() body: { technicianId?: string }): Promise<Job> {
    const target = isUuid(body?.technicianId) ? await this.repo.get(body.technicianId) : null;
    if (!target?.active) throw new BadRequestException('Choose an active technician');
    const job = await this.repo.reassignJob(jobId, target.id);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }
}
