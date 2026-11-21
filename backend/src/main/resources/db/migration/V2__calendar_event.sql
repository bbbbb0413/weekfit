create table calendar_event (
    id               uuid primary key,
    user_id          uuid         not null references app_user (id),
    external_id      varchar(200),
    title            varchar(200) not null,
    location         varchar(200),
    starts_at        timestamptz  not null,
    ends_at          timestamptz  not null,
    tpo              varchar(20)  not null,
    formality        integer      not null,
    dress_code       varchar(100),
    avoid_colors     text[]       not null default '{}',
    indoor           boolean,
    activity_level   varchar(10)  not null,
    importance       integer      not null,
    confidence       double precision not null,
    analysis_source  varchar(10)  not null,
    clarify_question varchar(200),
    created_at       timestamptz  not null,
    updated_at       timestamptz  not null
);
create index idx_calendar_event_user_start on calendar_event (user_id, starts_at);
create unique index uq_calendar_event_external on calendar_event (user_id, external_id) where external_id is not null;
