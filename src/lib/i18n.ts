import {defineI18n} from 'fumadocs-core/i18n';
import {defineI18nUI} from 'fumadocs-ui/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'vi'],
  fallbackLanguage: 'en',
  parser: 'dot',
  hideLocale: 'never',
});

export const i18nUI = defineI18nUI(i18n, {
  en: {
    displayName: 'English',
  },
  vi: {
    displayName: 'Tiếng Việt',
    search: 'Tìm kiếm',
    searchNoResult: 'Không tìm thấy kết quả',
    toc: 'Mục lục',
    tocNoHeadings: 'Không có đề mục',
    lastUpdate: 'Cập nhật lần cuối',
    chooseLanguage: 'Chọn ngôn ngữ',
    nextPage: 'Trang tiếp theo',
    previousPage: 'Trang trước',
    chooseTheme: 'Giao diện',
    editOnGithub: 'Chỉnh sửa trên GitHub',
  },
});
