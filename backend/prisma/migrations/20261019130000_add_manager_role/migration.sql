-- Manager: can delete/edit purchase (and running costs) with PIN; not full admin.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MANAGER';
