create table app_user (
    id          uuid primary key,
    name        varchar(50)  not null,
    warmth_bias integer      not null default 0,
    created_at  timestamptz  not null default now()
);

insert into app_user (id, name) values ('00000000-0000-0000-0000-000000000001', '데모 사용자');

create table clothing_item (
    id               uuid primary key,
    user_id          uuid         not null references app_user (id),
    name             varchar(100),
    image_key        varchar(200),
    category         varchar(20)  not null,
    sub_type         varchar(50),
    colors           text[]       not null default '{}',
    warmth           integer      not null,
    styles           text[]       not null default '{}',
    formality        integer      not null,
    status           varchar(20)  not null,
    wears_since_wash integer      not null default 0,
    wash_threshold   integer      not null,
    dry_until        timestamptz,
    last_worn_on     date,
    created_at       timestamptz  not null,
    updated_at       timestamptz  not null
);
create index idx_clothing_item_user on clothing_item (user_id);

create table wear_log (
    id         uuid primary key,
    user_id    uuid        not null references app_user (id),
    worn_on    date        not null,
    item_ids   uuid[]      not null,
    feedback   varchar(10),
    created_at timestamptz not null
);
create index idx_wear_log_user_date on wear_log (user_id, worn_on);
