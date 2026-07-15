# Invites API (OpenAPI fragment)

> **Статус:** implemented · **Auth:** JWT member (кроме `resolve`) · **BFF:** `services/bff/src/modules/invites/`  
> **Полный spec:** [bff/invites-api.md](../05-microservices/bff/invites-api.md) · **ADR:** [012](../03-architecture/adr/012-club-invite-via-logto.md)

Публичный BFF surface для клубных инвайтов (Logto one-time token + user-profile).

## Endpoints

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| `POST` | `/api/v1/invites` | JWT | Создать приглашение → `201` |
| `GET` | `/api/v1/invites` | JWT | Мои коды |
| `GET` | `/api/v1/invites/resolve` | public + IP rate limit | Код/token → Logto OTT |
| `POST` | `/api/v1/invites/claim` | JWT | Зафиксировать `inviterId` |

---

## OpenAPI 3.0 (paths fragment)

```yaml
paths:
  /api/v1/invites:
    post:
      operationId: createInvite
      tags: [invites]
      security: [{ bearerAuth: [] }]
      summary: Create club invite
      requestBody:
        required: false
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
                  description: Optional; synthetic email generated if omitted
      responses:
        '201':
          description: Invite created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InviteCreated'
        '401':
          description: Unauthorized
        '403':
          description: Monthly invite limit exceeded
        '422':
          description: Invalid email
        '502':
          description: Logto or user-profile upstream error
    get:
      operationId: listInvites
      tags: [invites]
      security: [{ bearerAuth: [] }]
      summary: List invites issued by current member
      parameters:
        - name: limit
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [data]
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/InviteListItem'

  /api/v1/invites/resolve:
    get:
      operationId: resolveInvite
      tags: [invites]
      summary: Resolve invite code or token for Logto sign-in
      parameters:
        - name: code
          in: query
          schema: { type: string, example: TAV-K7HM-9R2Q }
        - name: token
          in: query
          schema: { type: string, description: Raw Logto one-time token }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InviteResolved'
        '400':
          description: Neither code nor token provided
        '404':
          description: Not found
        '409':
          description: Invite exhausted
        '410':
          description: Invite expired
        '429':
          description: Rate limited (anonymous)

  /api/v1/invites/claim:
    post:
      operationId: claimInvite
      tags: [invites]
      security: [{ bearerAuth: [] }]
      summary: Bind inviterId after first sign-in
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                inviteCodeId: { type: string, format: uuid }
                inviterId: { type: string, format: uuid }
              description: At least one of inviteCodeId or inviterId
      responses:
        '200':
          description: Claimed or idempotent noop
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InviteClaimed'
        '401':
          description: Unauthorized
        '404':
          description: inviteCodeId not found
        '409':
          description: inviterId does not match code

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    InviteCreated:
      type: object
      required: [id, code, link, expiresAt, createdAt]
      properties:
        id: { type: string, format: uuid }
        code: { type: string, example: TAV-K7HM-9R2Q }
        link: { type: string, format: uri }
        email: { type: string, format: email, nullable: true }
        expiresAt: { type: string, format: date-time }
        createdAt: { type: string, format: date-time }
    InviteListItem:
      allOf:
        - $ref: '#/components/schemas/InviteCreated'
        - type: object
          properties:
            usesCount: { type: integer }
            maxUses: { type: integer }
            status:
              type: string
              enum: [active, redeemed, expired]
    InviteResolved:
      type: object
      required: [token]
      properties:
        token: { type: string, description: Pass to Logto signIn one_time_token }
        email: { type: string, format: email, nullable: true }
        inviterId: { type: string, format: uuid }
        inviteCodeId: { type: string, format: uuid }
        code: { type: string }
    InviteClaimed:
      type: object
      required: [userId, claimed]
      properties:
        userId: { type: string, format: uuid }
        inviterId: { type: string, format: uuid, nullable: true }
        invitationAcceptedAt: { type: string, format: date-time, nullable: true }
        claimed: { type: boolean }
```

---

## Flow (кратко)

1. Member: `POST /invites` → получает `code` + `link` (`/join?code=…`).
2. Guest: `GET /invites/resolve?code=` → `token` + `email` → Logto `signIn({ one_time_token })`.
3. After callback: `POST /invites/claim` → `inviterId` once (идемпотентно).

## Связанные документы

- [invites-api.md](../05-microservices/bff/invites-api.md) — полная оркестрация, Logto M2M, ошибки
- [club-access.md](../01-goal/club-access.md)
- [06-api/README.md](./README.md) — общие соглашения (RFC 7807, auth)
