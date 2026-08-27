import type {
  DifficultyState,
  DifficultySnapshot,
  Evaluation,
  TrainingCase,
  TrainingSession,
} from "@/core/types"
import { createPostgresClient, PostgresRepository } from "@/server/postgres-repository"

export type StoredSessionDetail = {
  session: TrainingSession
  trainingCase: TrainingCase
  evaluation: Evaluation | null
}

export type DashboardSnapshot = {
  sessions: StoredSessionDetail[]
  difficulty: DifficultyState | null
  difficultyHistory: DifficultySnapshot[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function loadStoredSessionDetail(id: string): Promise<StoredSessionDetail | null> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !UUID_PATTERN.test(id)) return null

  const sql = createPostgresClient(databaseUrl)
  try {
    const repository = new PostgresRepository(sql)
    const session = await repository.getSession(id)
    if (!session) return null
    const trainingCase = await repository.getCase(session.caseId)
    if (!trainingCase) return null
    const evaluations = await repository.listEvaluations(session.userId, 1_000)
    const evaluation = evaluations.find((item) => item.sessionId === session.id) ?? null
    return { session, trainingCase, evaluation }
  } catch {
    return null
  } finally {
    await sql.end({ timeout: 2 })
  }
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  const databaseUrl = process.env.DATABASE_URL
  const userId = process.env.SLACK_USER_ID
  if (!databaseUrl || !userId) return null

  const sql = createPostgresClient(databaseUrl)
  try {
    const repository = new PostgresRepository(sql)
    const [sessions, evaluations, difficulty, difficultyHistory] = await Promise.all([
      repository.listSessions(userId, 100),
      repository.listEvaluations(userId, 100),
      repository.getDifficultyState(userId),
      repository.listDifficultyHistory(userId, 100),
    ])
    const evaluationBySession = new Map(evaluations.map((item) => [item.sessionId, item]))
    const details = (
      await Promise.all(
        sessions.map(async (session) => {
          const trainingCase = await repository.getCase(session.caseId)
          if (!trainingCase) return null
          return {
            session,
            trainingCase,
            evaluation: evaluationBySession.get(session.id) ?? null,
          }
        }),
      )
    ).filter((item): item is StoredSessionDetail => item !== null)
    return { sessions: details, difficulty, difficultyHistory }
  } catch {
    return null
  } finally {
    await sql.end({ timeout: 2 })
  }
}
