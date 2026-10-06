// Run with: mongosh backend/mongo-init.js
// Creates the empty CodeShield database structure and indexes. No users or sample records are added.
const codeshieldDb = db.getSiblingDB('codeshield');

const collections = ['users', 'classrooms', 'assignments', 'assessments', 'auditlogs', 'notifications'];
for (const name of collections) {
  if (!codeshieldDb.getCollectionNames().includes(name)) codeshieldDb.createCollection(name);
}

codeshieldDb.users.createIndex({ email: 1 }, { unique: true });
codeshieldDb.classrooms.createIndex({ joinCode: 1 }, { unique: true });
codeshieldDb.classrooms.createIndex({ teacherId: 1 });
codeshieldDb.classrooms.createIndex({ students: 1 });
codeshieldDb.assignments.createIndex({ classId: 1 });
codeshieldDb.assignments.createIndex({ teacherId: 1 });
codeshieldDb.assessments.createIndex({ studentId: 1 });
codeshieldDb.assessments.createIndex({ assignmentId: 1 });
codeshieldDb.assessments.createIndex({ status: 1 });
codeshieldDb.notifications.createIndex({ userId: 1 });

print('CodeShield database initialized with empty collections.');
