import clsx from 'clsx';
import {
  MdComputer,
  MdContentPaste,
  MdFolderOpen,
  MdLanguage,
  MdMenuBook,
  MdRssFeed,
} from 'react-icons/md';
import { LuLibrary } from 'react-icons/lu';
import { IoFileTray } from 'react-icons/io5';
import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import MenuItem from '@/components/MenuItem';
import Menu from '@/components/Menu';

export interface ImportMenuProps {
  menuClassName?: string;
  setIsDropdownOpen?: (open: boolean) => void;
  onImportBooksFromFiles: () => void;
  onImportPastedText?: () => void;
  onImportBooksFromDirectory?: () => void;
  onScanComputerForBooks?: () => void;
  onImportFromWebBrowser?: () => void;
  onImportBookFromNovelUrl?: () => void;
  onOpenCatalogManager: () => void;
  onOpenFeeds: () => void;
}

const ImportMenu: React.FC<ImportMenuProps> = ({
  menuClassName,
  setIsDropdownOpen,
  onImportBooksFromFiles,
  onImportPastedText,
  onImportBooksFromDirectory,
  onScanComputerForBooks,
  onImportFromWebBrowser,
  onImportBookFromNovelUrl,
  onOpenCatalogManager,
  onOpenFeeds,
}) => {
  const _ = useTranslation();
  const { appService } = useEnv();

  const handleImportFromFiles = () => {
    onImportBooksFromFiles();
    setIsDropdownOpen?.(false);
  };

  const handleImportPastedText = () => {
    onImportPastedText?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromDirectory = () => {
    onImportBooksFromDirectory?.();
    setIsDropdownOpen?.(false);
  };

  const handleScanComputer = () => {
    onScanComputerForBooks?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromWebBrowser = () => {
    onImportFromWebBrowser?.();
    setIsDropdownOpen?.(false);
  };

  const handleImportFromNovelUrl = () => {
    onImportBookFromNovelUrl?.();
    setIsDropdownOpen?.(false);
  };

  const handleOpenCatalogManager = () => {
    onOpenCatalogManager();
    setIsDropdownOpen?.(false);
  };

  const handleOpenFeeds = () => {
    onOpenFeeds();
    setIsDropdownOpen?.(false);
  };

  return (
    <Menu
      className={clsx(
        'dropdown-content bg-base-100 rounded-box relative! z-[1] mt-3 p-2 shadow-sm',
        menuClassName,
      )}
      onCancel={() => setIsDropdownOpen?.(false)}
    >
      <MenuItem
        label={_('From Local File')}
        Icon={<IoFileTray className='h-5 w-5' />}
        onClick={handleImportFromFiles}
      />
      {onImportBooksFromDirectory && (
        <MenuItem
          label={_('Scan a Folder')}
          Icon={<MdFolderOpen className='h-5 w-5' />}
          onClick={handleImportFromDirectory}
        />
      )}
      {onScanComputerForBooks && (
        <MenuItem
          label={_('Scan This Computer')}
          Icon={<MdComputer className='h-5 w-5' />}
          onClick={handleScanComputer}
        />
      )}
      {onImportPastedText && (
        <MenuItem
          label={_('From Pasted Text')}
          Icon={<MdContentPaste className='h-5 w-5' />}
          onClick={handleImportPastedText}
        />
      )}
      <hr aria-hidden='true' className='border-base-200 my-1' />
      {onImportFromWebBrowser && (
        <MenuItem
          label={_('From Web Browser')}
          Icon={<MdLanguage className='h-5 w-5' />}
          onClick={handleImportFromWebBrowser}
        />
      )}
      {onImportBookFromNovelUrl && (
        <MenuItem
          label={_('From Web Novel')}
          Icon={<MdMenuBook className='h-5 w-5' />}
          onClick={handleImportFromNovelUrl}
        />
      )}
      <MenuItem
        label={_('From Feed URL')}
        Icon={<MdRssFeed className='h-5 w-5' />}
        onClick={handleOpenFeeds}
      />
      <MenuItem
        label={appService?.isOnlineCatalogsAccessible ? _('Online Library') : _('OPDS Catalogs')}
        Icon={<LuLibrary className='h-5 w-5' />}
        onClick={handleOpenCatalogManager}
      />
    </Menu>
  );
};

export default ImportMenu;
