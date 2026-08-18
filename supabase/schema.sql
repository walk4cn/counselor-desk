-- 辅导员工作台 · Supabase 云端同步初始化脚本
-- 用法：在 Supabase 控制台 → SQL Editor（SQL 编辑器）中新建查询，粘贴本文件全部内容后运行一次即可。
-- 该脚本只创建一个数据表并开启按登录用户隔离的行级安全（RLS），不会改动其他任何结构。

-- 工作区记录表：每一行对应 v8 工作区持久化协议写入的一条记录
-- （workspace_v8_pointer 指针，或 workspace_v8_chunk:世代:序号 数据块）。
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