use crate::transfer_file::ensure_path_allowed;
use std::path::Path;
use tauri::AppHandle;
use walkdir::WalkDir;

#[derive(serde::Serialize)]
pub struct ScannedFile {
    pub path: String,
    pub size: u64,
}

#[tauri::command]
pub async fn read_dir<R: tauri::Runtime>(
    app: AppHandle<R>,
    path: String,
    recursive: bool,
    extensions: Vec<String>,
) -> Result<Vec<ScannedFile>, String> {
    let resolved = ensure_path_allowed(&app, &path).map_err(|e| e.to_string())?;
    let resolved = resolved.to_string_lossy().into_owned();

    // The walk stats every matching file; on a large watched folder that is
    // thousands of syscalls. A sync command would run them inline on the IPC
    // dispatch thread and freeze the UI on every focus-triggered scan
    // (issue #5494) — offload to the blocking pool like the parsers do.
    tauri::async_runtime::spawn_blocking(move || {
        read_dir_sync(&resolved, &path, recursive, &extensions)
    })
    .await
    .map_err(|e| format!("join error: {e}"))?
}

fn read_dir_sync(
    path: &str,
    requested_path: &str,
    recursive: bool,
    extensions: &[String],
) -> Result<Vec<ScannedFile>, String> {
    let path_buf = std::path::PathBuf::from(path);
    let mut files = Vec::new();

    let normalized_extensions: Vec<String> =
        extensions.iter().map(|ext| ext.to_lowercase()).collect();

    if recursive {
        let is_home_root = ["HOME", "USERPROFILE"]
            .iter()
            .filter_map(std::env::var_os)
            .any(|home| Path::new(&home) == path_buf);
        let walker = WalkDir::new(path).into_iter().filter_entry(|entry| {
            !(entry.file_type().is_dir()
                && should_skip_dir(entry.file_name(), entry.depth(), is_home_root))
        });
        for entry_result in walker {
            match entry_result {
                Ok(entry) => {
                    if entry.file_type().is_file() {
                        if let Some(scanned_file) =
                            process_file_entry(entry.path(), &normalized_extensions)
                        {
                            files.push(scanned_file);
                        }
                    }
                }
                Err(e) => {
                    log::warn!("RUST: Skipping file due to error: {}", e);
                }
            }
        }
    } else {
        match std::fs::read_dir(&path_buf) {
            Ok(entries) => {
                for entry_result in entries {
                    match entry_result {
                        Ok(entry) => {
                            let path = entry.path();
                            if path.is_file() {
                                if let Some(scanned_file) =
                                    process_file_entry(&path, &normalized_extensions)
                                {
                                    files.push(scanned_file);
                                }
                            }
                        }
                        Err(e) => {
                            log::warn!("RUST: Skipping entry due to error: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                return Err(format!("Failed to read directory: {}", e));
            }
        }
    }

    // Callers strip the requested root to obtain relative paths. Preserve its
    // spelling even when authorization resolves symlinks or Windows prefixes.
    for file in &mut files {
        let relative = Path::new(&file.path)
            .strip_prefix(&path_buf)
            .map_err(|e| e.to_string())?;
        file.path = Path::new(requested_path)
            .join(relative)
            .to_string_lossy()
            .into_owned();
    }
    Ok(files)
}

// A scan of a whole home folder must not walk app data: it holds this library's
// own copies and on-demand cloud drives, and is far larger than the user's files.
fn should_skip_dir(name: &std::ffi::OsStr, depth: usize, is_home_root: bool) -> bool {
    if depth == 0 {
        return false;
    }
    let name = name.to_string_lossy();
    name.starts_with('.')
        || name == "node_modules"
        || (is_home_root && depth == 1 && (name == "Library" || name == "AppData"))
}

fn process_file_entry(path: &Path, extensions: &[String]) -> Option<ScannedFile> {
    if extensions.is_empty() || extensions.contains(&"*".to_string()) {
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        return Some(ScannedFile {
            path: path.to_string_lossy().to_string(),
            size,
        });
    } else if let Some(ext) = path.extension() {
        let ext_str = ext.to_string_lossy().to_lowercase();
        if extensions.contains(&ext_str) {
            let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            return Some(ScannedFile {
                path: path.to_string_lossy().to_string(),
                size,
            });
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_skips_hidden_and_app_data_dirs_only_where_they_apply() {
        let skip =
            |name: &str, depth, home| should_skip_dir(std::ffi::OsStr::new(name), depth, home);
        assert!(skip(".Trash", 1, false));
        assert!(skip("node_modules", 3, false));
        assert!(skip("Library", 1, true));
        // A folder of books that happens to be called Library is still scanned.
        assert!(!skip("Library", 1, false));
        assert!(!skip("Library", 2, true));
        assert!(!skip("Downloads", 1, true));
        // The root the user chose is always walked.
        assert!(!skip(".hidden-root", 0, false));
    }

    #[test]
    fn scan_preserves_requested_root_spelling() {
        let root = std::env::temp_dir().join(format!("readest-scan-{}", std::process::id()));
        std::fs::create_dir_all(root.join("nested")).unwrap();
        std::fs::write(root.join("nested/book.epub"), b"book").unwrap();
        let canonical = root.canonicalize().unwrap();
        let requested = root.join("alias");
        let files = read_dir_sync(
            canonical.to_str().unwrap(),
            requested.to_str().unwrap(),
            true,
            &["epub".into()],
        )
        .unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(
            files[0].path,
            requested.join("nested/book.epub").to_string_lossy()
        );
        std::fs::remove_dir_all(root).unwrap();
    }
}
