use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::commands::items::TemplateOverview;
use crate::db::TemplateItem;

pub const DEFAULT_PAGE_SIZE: i64 = 12;
pub const MAX_PAGE_SIZE: i64 = 100;
pub const MAX_LIST_LIMIT: i64 = 5000;

pub fn list_items(connection: &Connection, limit: i64) -> Result<Vec<TemplateItem>, rusqlite::Error> {
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, summary, status, created_at, updated_at
        FROM template_items
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?1
        "#,
    )?;

    let rows = statement.query_map(params![limit], map_template_item)?;
    rows.collect::<Result<Vec<_>, _>>()
}

pub fn paginate_items(
    connection: &Connection,
    page: i64,
    page_size: i64,
    query: Option<String>,
    status: Option<String>,
) -> Result<(Vec<TemplateItem>, i64), rusqlite::Error> {
    let offset = (page - 1) * page_size;

    let total: i64 = connection.query_row(
        r#"
        SELECT COUNT(*)
        FROM template_items
        WHERE (?1 IS NULL OR title LIKE '%' || ?1 || '%' OR summary LIKE '%' || ?1 || '%')
          AND (?2 IS NULL OR status = ?2)
        "#,
        params![query.clone(), status.clone()],
        |row| row.get(0),
    )?;

    let mut statement = connection.prepare(
        r#"
        SELECT id, title, summary, status, created_at, updated_at
        FROM template_items
        WHERE (?1 IS NULL OR title LIKE '%' || ?1 || '%' OR summary LIKE '%' || ?1 || '%')
          AND (?2 IS NULL OR status = ?2)
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?3 OFFSET ?4
        "#,
    )?;

    let rows = statement.query_map(params![query, status, page_size, offset], map_template_item)?;
    let items = rows.collect::<Result<Vec<_>, _>>()?;

    Ok((items, total))
}

pub fn fetch_item_by_id(connection: &Connection, id: &str) -> Result<TemplateItem, rusqlite::Error> {
    connection.query_row(
        r#"
        SELECT id, title, summary, status, created_at, updated_at
        FROM template_items
        WHERE id = ?1
        "#,
        params![id],
        map_template_item,
    )
}

pub fn create_item(
    connection: &mut Connection,
    title: &str,
    summary: &str,
    status: &str,
) -> Result<String, rusqlite::Error> {
    let id = Uuid::new_v4().to_string();
    let transaction = connection.transaction()?;
    transaction.execute(
        r#"
        INSERT INTO template_items (id, title, summary, status, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![id, title, summary, status],
    )?;
    transaction.commit()?;

    Ok(id)
}

pub fn update_item(
    connection: &mut Connection,
    id: &str,
    title: &str,
    summary: &str,
    status: &str,
) -> Result<(), rusqlite::Error> {
    let transaction = connection.transaction()?;
    let affected_rows = transaction.execute(
        r#"
        UPDATE template_items
        SET title = ?2,
            summary = ?3,
            status = ?4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?1
        "#,
        params![id, title, summary, status],
    )?;

    if affected_rows == 0 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }

    transaction.commit()?;
    Ok(())
}

pub fn delete_item(connection: &mut Connection, id: &str) -> Result<(), rusqlite::Error> {
    let transaction = connection.transaction()?;
    let affected_rows = transaction.execute("DELETE FROM template_items WHERE id = ?1", params![id])?;

    if affected_rows == 0 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }

    transaction.commit()?;
    Ok(())
}

pub fn fetch_overview(connection: &Connection) -> Result<TemplateOverview, rusqlite::Error> {
    connection.query_row(
        r#"
        SELECT
            COUNT(*) AS total_items,
            COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_items,
            COALESCE(SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END), 0) AS archived_items,
            COALESCE(SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END), 0) AS draft_items
        FROM template_items
        "#,
        [],
        |row| {
            Ok(TemplateOverview {
                total_items: row.get(0)?,
                active_items: row.get(1)?,
                archived_items: row.get(2)?,
                draft_items: row.get(3)?,
            })
        },
    )
}

fn map_template_item(row: &rusqlite::Row<'_>) -> rusqlite::Result<TemplateItem> {
    Ok(TemplateItem {
        id: row.get(0)?,
        title: row.get(1)?,
        summary: row.get(2)?,
        status: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}
