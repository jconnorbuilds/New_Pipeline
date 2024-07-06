from django.core.mail.backends.filebased import EmailBackend
import datetime
import os


class CustomEmailBackend(EmailBackend):
    """
    Simply overrids the fname to generate .eml files which can be easily opened in a mail application, or previewed on Mac.
    """

    def _get_filename(self):
        """Return a unique file name."""
        if self._fname is None:
            timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
            fname = "%s-%s.eml" % (timestamp, abs(id(self)))
            self._fname = os.path.join(self.file_path, fname)

        return self._fname
