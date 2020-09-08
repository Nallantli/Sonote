@echo off
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/Listener.java" -d "bin/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/StandardOutput.java" -d "bin/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/StandardError.java" -d "bin/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/LibraryOutput.java" -d "bin/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/LibraryError.java" -d "bin/"
javac -encoding utf8 -cp "bin/*;bin/external/*" -sourcepath src "src/Decoder.java" -d "bin/"