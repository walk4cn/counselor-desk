-- 辅导员工作台 · Supabase 重置脚本（清空云端数据后重新初始化）
-- 用法：在 Supabase 控制台 → SQL Editor 中粘贴本文件全部内容并运行一次。
-- 注意：该操作会删除 workspace_records 表及其中所有账号的云端数据
-- （各终端本机数据不受影响，重新登录后点击“立即同步”即可重新上传）。

drop table if exists public.workspace_records;

-- 工作区记录表：每一行对应 v8 工作区持久化协议写入的一条记录
-- （workspace_v8_pointer 指针，或 workspace_v8_chunk:世代:序号 数据块）。
-- id 由客户端按 "<账号用户 id>:<记录 id>" 命名空间写入（例如
-- 3f2c…uuid:workspace_v8_active），不同账号写入互不相交的键，
-- 避免 upsert 撞到其他账号的行而触发 RLS 的 UPDATE 检查。
create table if not exists public.workspace_records (
  id text primary key,
  owner_id uuid not null default auth.uid(),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 查询索引：按用户 + 更新时间加速启动拉取与清理
create index if not exists workspace_records_owner_idx on public.workspace_records (owner_id);
create index if not exists workspace_records_updated_idx on public.workspace_records (updated_at desc);

-- 启用行级安全：每个账号只能读写自己的数据，实现多终端互通且互不可见
alter table public.workspace_records enable row level security;

drop policy if exists workspace_records_select_own on public.workspace_records;
create policy workspace_records_select_own on public.workspace_records
  for select using (auth.uid() = owner_id);

drop policy if exists workspace_records_insert_own on public.workspace_records;
create policy workspace_records_insert_own on public.workspace_records
  for insert with check (auth.uid() = owner_id);

drop policy if exists workspace_records_update_own on public.workspace_records;
create policy workspace_records_update_own on public.workspace_records
  for update using (auth.uid() = owner_id);

drop policy if exists workspace_records_delete_own on public.workspace_records;
create policy workspace_records_delete_own on public.workspace_records
  for delete using (auth.uid() = owner_id);
