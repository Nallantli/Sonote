import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

interface DownloadProxy {
	public void sendData(String value);
}

public class Downloader {
	private static final String SONO_URL = "https://github.com/Nallantli/Sono/archive/master.zip";
	private static final int BUFFER_SIZE = 4096;
	public DownloadProxy dp;

	public Downloader(DownloadProxy dp) {
		this.dp = dp;
	}

	public void copyURLToFile(final URL url, final File file) throws IOException {
		try (InputStream input = url.openStream()) {
			if (file.exists()) {
				if (!file.canWrite())
					throw new IOException("File '" + file + "' cannot be written");
			} else {
				final File parent = file.getParentFile();
				if ((parent != null) && (!parent.exists()) && (!parent.mkdirs())) {
					throw new IOException("File '" + file + "' could not be created");
				}
			}

			try (FileOutputStream output = new FileOutputStream(file);) {
				final byte[] buffer = new byte[4096];
				int n = 0;
				while (-1 != (n = input.read(buffer))) {
					output.write(buffer, 0, n);
				}
			}
		}
	}

	public void unzipFile(final File zipFilePath, final File destDir) throws IOException {
		try (ZipInputStream zipIn = new ZipInputStream(new FileInputStream(zipFilePath));) {
			ZipEntry entry = zipIn.getNextEntry();
			while (entry != null) {
				final String filePath = destDir.getAbsolutePath() + File.separator + entry.getName();
				if (!entry.isDirectory()) {
					extractFile(zipIn, filePath);
				} else {
					final File dir = new File(filePath);
					dir.mkdirs();
				}
				zipIn.closeEntry();
				entry = zipIn.getNextEntry();
			}
		}
	}

	private void extractFile(final ZipInputStream zipIn, final String filePath) throws IOException {
		try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(filePath));) {
			final byte[] bytesIn = new byte[BUFFER_SIZE];
			int read = 0;
			while ((read = zipIn.read(bytesIn)) != -1) {
				bos.write(bytesIn, 0, read);
			}
		}
	}

	public void deleteDirectory(final File directoryToBeDeleted) throws IOException {
		final File[] allContents = directoryToBeDeleted.listFiles();
		if (allContents != null) {
			for (final File file : allContents) {
				deleteDirectory(file);
			}
		}
		Files.delete(directoryToBeDeleted.toPath());
	}

	public void downloadSono(final String sonoPath) {
		try {
			final File dir = new File(sonoPath);
			if (dir.exists())
				deleteDirectory(dir);
			dir.mkdir();
			final File sonoTemp = new File("SONO.zip");
			final File sonoFolder = new File("SONO-tmp");
			copyURLToFile(new URL(SONO_URL), sonoTemp);
			if (sonoFolder.exists())
				deleteDirectory(sonoFolder);
			sonoFolder.mkdirs();
			dp.sendData("Unzipping Repo...");
			unzipFile(sonoTemp, sonoFolder);
			Files.deleteIfExists(sonoTemp.toPath());

			final File master = new File(sonoFolder, "Sono-master");

			dp.sendData("Building Binaries...");
			if (isWindows()) {
				File build_jar = new File(sonoFolder, "Sono-master/build-jar.bat");
				File build_lib = new File(sonoFolder, "Sono-master/build-lib.bat");
				dp.sendData("Running " + build_jar.getAbsolutePath());
				Process p1 = Runtime.getRuntime().exec(new String[] { "cmd", "/c", "start", "Building Binary", "/wait",
						"cmd", "/c", build_jar.getAbsolutePath() }, null, master);
				p1.waitFor();
				dp.sendData("Running " + build_lib.getAbsolutePath());
				Process p2 = Runtime.getRuntime().exec(new String[] { "cmd", "/c", "start", "Building Libraries",
						"/wait", "cmd", "/c", build_lib.getAbsolutePath() }, null, master);
				p2.waitFor();
			} else {
				File build_jar = new File(sonoFolder, "Sono-master/build-jar.sh");
				File build_lib = new File(sonoFolder, "Sono-master/build-lib.sh");
				dp.sendData("Running " + build_jar.getAbsolutePath());
				Runtime.getRuntime().exec("sh " + build_jar.getAbsolutePath(), null, master);
				dp.sendData("Running " + build_lib.getAbsolutePath());
				Runtime.getRuntime().exec("sh " + build_lib.getAbsolutePath(), null, master);
			}

			dp.sendData("Cloning /bin...");
			final Path sourcePath = new File(master, "bin").toPath();
			final Path targetPath = dir.toPath();
			if (targetPath.toFile().exists())
				deleteDirectory(targetPath.toFile());

			Files.walkFileTree(sourcePath, new SimpleFileVisitor<Path>() {
				@Override
				public FileVisitResult preVisitDirectory(final Path dir, final BasicFileAttributes attrs)
						throws IOException {
					Files.createDirectories(targetPath.resolve(sourcePath.relativize(dir)));
					return FileVisitResult.CONTINUE;
				}

				@Override
				public FileVisitResult visitFile(final Path file, final BasicFileAttributes attrs) throws IOException {
					Files.copy(file, targetPath.resolve(sourcePath.relativize(file)));
					return FileVisitResult.CONTINUE;
				}
			});

			dp.sendData("Compiling Sonote Proxies...");
			Process p = Runtime.getRuntime().exec(
					new String[] { "cmd", "/c", "start", "Building Sonote Proxies", "/wait", "cmd", "/c", "build.bat" },
					null);
			p.waitFor();
			deleteDirectory(sonoFolder);
			dp.sendData("Relaunching");
		} catch (IOException e) {
			e.printStackTrace();
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}

	public static boolean isWindows() {
		return System.getProperty("os.name").startsWith("Windows");
	}
}